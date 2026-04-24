const express = require('express');
const cors = require('cors');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = 'xinfang-platform-secret-key-2024';

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Auth middleware
const auth = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: '未登录' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: '登录已过期' });
  }
};

const roleCheck = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: '权限不足' });
  }
  next();
};

// ==================== Auth ====================
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(401).json({ error: '用户名或密码错误' });

    const bcrypt = require('bcryptjs');
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: '用户名或密码错误' });

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role, department_id: user.department_id, phone: user.phone } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { department: true },
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== Public (No Auth) ====================
// Send SMS code
const smsCodes = {}; // In-memory: { phone: { code, expiresAt } }
app.post('/api/public/send-code', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || !/^1\d{10}$/.test(phone)) {
      return res.status(400).json({ error: '手机号格式不正确' });
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    smsCodes[phone] = { code, expiresAt: Date.now() + 60000 };
    console.log(`[SMS] 验证码 ${code} 已发送至 ${phone}`);
    // In production: integrate SMS gateway here
    res.json({ success: true, message: '验证码已发送' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public login (SMS code + phone, auto-register if new)
app.post('/api/public/login', async (req, res) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) return res.status(400).json({ error: '请提供手机号和验证码' });
    const stored = smsCodes[phone];
    if (!stored || stored.code !== code || Date.now() > stored.expiresAt) {
      return res.status(401).json({ error: '验证码无效或已过期' });
    }
    delete smsCodes[phone];

    // Find or create public user
    let user = await prisma.user.findUnique({ where: { username: phone } });
    if (!user) {
      const bcrypt = require('bcryptjs');
      user = await prisma.user.create({
        data: {
          username: phone,
          password_hash: bcrypt.hashSync(code, 10),
          name: phone.slice(-4),
          role: 'public',
          phone,
        },
      });
    }
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role, name: user.name, phone: user.phone }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role, phone: user.phone } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public submit case (no auth, just phone verification via token)
app.post('/api/cases', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
      } catch {}
    }
    // Allow submit with valid user token or public token
    if (!req.user || req.user.role !== 'public') {
      return res.status(401).json({ error: '请先登录' });
    }

    const { dateStr, prefix } = generateCaseNo();
    const todayCases = await prisma.case.findMany({
      where: { case_no: { startsWith: prefix } },
      orderBy: { case_no: 'desc' },
    });
    const seq = todayCases.length + 1;
    const case_no = `${prefix}-${String(seq).padStart(3, '0')}`;

    const caseData = { ...req.body, case_no, status: req.body.status || '待受理' };
    const newCase = await prisma.case.create({ data: caseData });

    await prisma.caseProgress.create({
      data: {
        case_id: newCase.id,
        operator_id: req.user.id,
        action: '群众提交',
        description: `群众提交诉求 ${case_no}`,
        new_status: '待受理',
      },
    });

    res.json(newCase);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Search cases by phone (public query)
app.get('/api/cases/search-by-phone', auth, async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ error: '请提供手机号' });
    const cases = await prisma.case.findMany({
      where: { petitioner_phone: phone },
      include: { dispatchDepartment: true },
      orderBy: { created_at: 'desc' },
    });
    res.json({ cases });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Accept/reject pending case (supervisor/admin)
app.post('/api/cases/:id/accept', auth, async (req, res) => {
  try {
    const caseId = Number(req.params.id);
    const oldCase = await prisma.case.findUnique({ where: { id: caseId } });

    const updated = await prisma.case.update({
      where: { id: caseId },
      data: { status: '已签收', handler_id: req.user.id },
    });

    await recordProgress(caseId, req.user.id, '签收案件', `${req.user.name} 签收案件`, oldCase.status, '已签收');

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reject pending case (supervisor/admin)
app.post('/api/cases/:id/reject', auth, roleCheck('admin', 'supervisor'), async (req, res) => {
  try {
    const caseId = Number(req.params.id);
    const { reason } = req.body;
    const oldCase = await prisma.case.findUnique({ where: { id: caseId } });

    const updated = await prisma.case.update({
      where: { id: caseId },
      data: { status: '已驳回' },
    });

    await recordProgress(caseId, req.user.id, '驳回受理', reason || '审核驳回，不予受理', oldCase.status, '已驳回');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Accept pending case (supervisor/admin) - move from 待受理 to 新建
app.post('/api/cases/:id/accept-pending', auth, roleCheck('admin', 'supervisor'), async (req, res) => {
  try {
    const caseId = Number(req.params.id);
    const oldCase = await prisma.case.findUnique({ where: { id: caseId } });
    if (oldCase.status !== '待受理') {
      return res.status(400).json({ error: '只有待受理状态的案件才能受理' });
    }

    const updated = await prisma.case.update({
      where: { id: caseId },
      data: { status: '新建' },
    });

    await recordProgress(caseId, req.user.id, '受理案件', `受理群众诉求 ${oldCase.case_no}，进入待分派`, oldCase.status, '新建');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reject pending case (supervisor/admin)
app.post('/api/cases/:id/reject-pending', auth, roleCheck('admin', 'supervisor'), async (req, res) => {
  try {
    const caseId = Number(req.params.id);
    const { reason } = req.body;
    const oldCase = await prisma.case.findUnique({ where: { id: caseId } });
    if (oldCase.status !== '待受理') {
      return res.status(400).json({ error: '只有待受理状态的案件才能驳回' });
    }

    const updated = await prisma.case.update({
      where: { id: caseId },
      data: { status: '已驳回' },
    });

    await recordProgress(caseId, req.user.id, '驳回受理', reason || '审核驳回，不予受理', oldCase.status, '已驳回');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== Cases ====================
// Generate case number
function generateCaseNo() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  return { dateStr, prefix: `BZ-${dateStr}` };
}

// Calculate similarity between two cases (for merge detection)
function calculateSimilarity(case1, case2) {
  let score = 0;
  // People match
  if (case1.petitioner_name === case2.petitioner_name) score += 0.3;
  if (case1.petitioner_phone === case2.petitioner_phone) score += 0.3;
  // Type match
  if (case1.case_type === case2.case_type) score += 0.15;
  // Source match
  if (case1.source === case2.source) score += 0.1;
  // Keyword overlap (simple)
  const words1 = new Set(case1.content?.split('') || []);
  const words2 = new Set(case2.content?.split('') || []);
  const intersection = [...words1].filter(w => words2.has(w)).length;
  const union = new Set([...words1, ...words2]).size;
  score += (union > 0 ? intersection / union : 0) * 0.15;
  return Math.min(score, 1);
}

// Case similarity check endpoint
app.post('/api/cases/check-similarity', auth, async (req, res) => {
  try {
    const { petitioner_name, petitioner_phone, case_type, source, content } = req.body;
    const existingCases = await prisma.case.findMany({
      where: { status: { notIn: ['已完成', '已撤案', '已合并'] } },
    });

    const similar = [];
    for (const c of existingCases) {
      const score = calculateSimilarity(
        { petitioner_name, petitioner_phone, case_type, source, content },
        c
      );
      if (score > 0.5) {
        similar.push({ ...c, similarity: score });
      }
    }
    similar.sort((a, b) => b.similarity - a.similarity);
    res.json(similar.filter(s => s.similarity > 0.5));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List cases
app.get('/api/cases', auth, async (req, res) => {
  try {
    const { page = 1, pageSize = 10, status, case_type, source, keyword, my } = req.query;
    const where = {};

    if (status) where.status = status;
    if (case_type) where.case_type = case_type;
    if (source) where.source = source;
    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { petitioner_name: { contains: keyword } },
        { case_no: { contains: keyword } },
      ];
    }
    if (my === 'true') {
      where.handler_id = req.user.id;
    }
    if (my === 'dispatch') {
      where.dispatch_department_id = req.user.department_id;
    }

    // Admin/supervisor see all; handler sees only their cases
    if (req.user.role === 'handler' && !my) {
      where.handler_id = req.user.id;
    }

    const [cases, total] = await Promise.all([
      prisma.case.findMany({
        where,
        include: {
          dispatchDepartment: true,
          handler: { select: { id: true, name: true } },
          children: { select: { id: true, case_no: true, status: true } },
          parent: { select: { id: true, case_no: true } },
        },
        orderBy: { created_at: 'desc' },
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
      }),
      prisma.case.count({ where }),
    ]);

    res.json({ cases, total, page: Number(page), pageSize: Number(pageSize) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create case
app.post('/api/cases', auth, roleCheck('admin', 'supervisor'), async (req, res) => {
  try {
    const { dateStr, prefix } = generateCaseNo();
    const todayCases = await prisma.case.findMany({
      where: { case_no: { startsWith: prefix } },
      orderBy: { case_no: 'desc' },
    });
    const seq = todayCases.length + 1;
    const case_no = `${prefix}-${String(seq).padStart(3, '0')}`;

    const caseData = { ...req.body, case_no, status: '新建' };
    const newCase = await prisma.case.create({ data: caseData });

    // Record progress
    await prisma.caseProgress.create({
      data: {
        case_id: newCase.id,
        operator_id: req.user.id,
        action: '新建案件',
        description: `创建案件 ${case_no}`,
        new_status: '新建',
      },
    });

    res.json(newCase);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Excel import
app.post('/api/cases/import', auth, roleCheck('admin', 'supervisor'), async (req, res) => {
  try {
    const ExcelJS = require('exceljs');
    const cases = req.body.cases; // Array of case objects from parsed Excel
    const results = [];

    for (const c of cases) {
      const { dateStr, prefix } = generateCaseNo();
      const todayCases = await prisma.case.findMany({
        where: { case_no: { startsWith: prefix } },
      });
      const case_no = `${prefix}-${String(todayCases.length + 1).padStart(3, '0')}`;

      const newCase = await prisma.case.create({
        data: {
          case_no,
          title: c.title || c['案件标题'] || '导入案件',
          petitioner_name: c.petitioner_name || c['信访人'] || '',
          petitioner_phone: c.petitioner_phone || c['联系电话'] || '',
          case_type: c.case_type || c['案件类型'] || '其他',
          source: c.source || c['来源'] || '其他',
          content: c.content || c['案件内容'] || '',
          status: '新建',
        },
      });

      await prisma.caseProgress.create({
        data: {
          case_id: newCase.id,
          operator_id: req.user.id,
          action: '批量导入',
          description: `批量导入案件 ${case_no}`,
          new_status: '新建',
        },
      });

      results.push(newCase);
    }

    res.json({ imported: results.length, cases: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get case detail
app.get('/api/cases/:id', auth, async (req, res) => {
  try {
    const caseData = await prisma.case.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        dispatchDepartment: true,
        handler: { select: { id: true, name: true } },
        children: { select: { id: true, case_no: true, status: true, handler: { select: { name: true } } } },
        parent: { select: { id: true, case_no: true, title: true } },
        progress: { include: { operator: { select: { id: true, name: true } } }, orderBy: { created_at: 'desc' } },
        attachments: { orderBy: { created_at: 'desc' } },
      },
    });
    res.json(caseData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update case
app.put('/api/cases/:id', auth, async (req, res) => {
  try {
    const updated = await prisma.case.update({
      where: { id: Number(req.params.id) },
      data: req.body,
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== Case Actions ====================
function recordProgress(caseId, operatorId, action, description, oldStatus, newStatus) {
  return prisma.caseProgress.create({
    data: {
      case_id: caseId,
      operator_id: operatorId,
      action,
      description,
      old_status: oldStatus,
      new_status: newStatus,
    },
  });
}

// Dispatch case
app.post('/api/cases/:id/dispatch', auth, roleCheck('admin', 'supervisor'), async (req, res) => {
  try {
    const caseId = Number(req.params.id);
    const { dispatch_department_id, co_departments, deadline, handler_id } = req.body;
    const oldCase = await prisma.case.findUnique({ where: { id: caseId } });

    const updated = await prisma.case.update({
      where: { id: caseId },
      data: {
        status: '已分派',
        dispatch_department_id,
        co_departments: co_departments ? JSON.stringify(co_departments) : null,
        deadline: deadline ? new Date(deadline) : null,
        handler_id: handler_id || null,
      },
    });

    await recordProgress(caseId, req.user.id, '分派案件', `分派至部门ID: ${dispatch_department_id}`, oldCase.status, '已分派');

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Accept case (handler signs)
app.post('/api/cases/:id/accept', auth, async (req, res) => {
  try {
    const caseId = Number(req.params.id);
    const oldCase = await prisma.case.findUnique({ where: { id: caseId } });

    const updated = await prisma.case.update({
      where: { id: caseId },
      data: { status: '已签收', handler_id: req.user.id },
    });

    await recordProgress(caseId, req.user.id, '签收案件', `${req.user.name} 签收案件`, oldCase.status, '已签收');

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Process case (start working)
app.post('/api/cases/:id/process', auth, async (req, res) => {
  try {
    const caseId = Number(req.params.id);
    const { description } = req.body;
    const oldCase = await prisma.case.findUnique({ where: { id: caseId } });

    const updated = await prisma.case.update({
      where: { id: caseId },
      data: { status: '办理中' },
    });

    await recordProgress(caseId, req.user.id, '开始办理', description || '开始办理案件', oldCase.status, '办理中');

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit for review
app.post('/api/cases/:id/submit-review', auth, async (req, res) => {
  try {
    const caseId = Number(req.params.id);
    const { result } = req.body;
    const oldCase = await prisma.case.findUnique({ where: { id: caseId } });

    const updated = await prisma.case.update({
      where: { id: caseId },
      data: {
        status: '待审核',
        content: result ? oldCase.content + `\n\n【办理结果】\n${result}` : oldCase.content,
      },
    });

    await recordProgress(caseId, req.user.id, '提交审核', result || '提交办理结果', oldCase.status, '待审核');

    // Check if this is a child case - AND gate for parent
    if (oldCase.parent_id) {
      const siblings = await prisma.case.findMany({
        where: { parent_id: oldCase.parent_id, id: { not: caseId } },
      });
      const allPending = siblings.every(s => s.status === '待审核' || s.status === '已完成');
      if (allPending) {
        await prisma.case.update({
          where: { id: oldCase.parent_id },
          data: { status: '待审核' },
        });
        await recordProgress(oldCase.parent_id, req.user.id, '子案全部提交审核', '所有子案已提交审核', null, '待审核');
      }
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Complete case
app.post('/api/cases/:id/complete', auth, roleCheck('admin', 'supervisor'), async (req, res) => {
  try {
    const caseId = Number(req.params.id);
    const oldCase = await prisma.case.findUnique({ where: { id: caseId } });

    const updated = await prisma.case.update({
      where: { id: caseId },
      data: { status: '已完成' },
    });

    await recordProgress(caseId, req.user.id, '完成结案', '审核通过，案件结案', oldCase.status, '已完成');

    // Check parent AND gate
    if (oldCase.parent_id) {
      const siblings = await prisma.case.findMany({
        where: { parent_id: oldCase.parent_id },
      });
      const allComplete = siblings.every(s => s.status === '已完成');
      if (allComplete) {
        await prisma.case.update({
          where: { id: oldCase.parent_id },
          data: { status: '已完成' },
        });
        await recordProgress(oldCase.parent_id, req.user.id, '子案全部结案', 'AND门通过，主案自动结案', null, '已完成');
      }
    }

    // Sync merged cases
    const mergeRecords = await prisma.mergeRecord.findMany({
      where: { main_case_id: caseId },
    });
    for (const mr of mergeRecords) {
      const mergedIds = JSON.parse(mr.merged_case_ids);
      await prisma.case.updateMany({
        where: { id: { in: mergedIds } },
        data: { status: '已完成' },
      });
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reject case (send back to handler)
app.post('/api/cases/:id/reject', auth, roleCheck('admin', 'supervisor'), async (req, res) => {
  try {
    const caseId = Number(req.params.id);
    const { reason } = req.body;
    const oldCase = await prisma.case.findUnique({ where: { id: caseId } });

    const updated = await prisma.case.update({
      where: { id: caseId },
      data: { status: '办理中' },
    });

    await recordProgress(caseId, req.user.id, '驳回', reason || '审核驳回', oldCase.status, '办理中');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Withdraw case
app.post('/api/cases/:id/withdraw', auth, roleCheck('admin', 'supervisor'), async (req, res) => {
  try {
    const caseId = Number(req.params.id);
    const oldCase = await prisma.case.findUnique({ where: { id: caseId } });

    const updated = await prisma.case.update({
      where: { id: caseId },
      data: { status: '已撤案' },
    });

    await recordProgress(caseId, req.user.id, '撤案', '案件已撤案', oldCase.status, '已撤案');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Batch withdraw
app.post('/api/cases/batch-withdraw', auth, roleCheck('admin', 'supervisor'), async (req, res) => {
  try {
    const { ids } = req.body;
    let count = 0;
    for (const id of ids) {
      const oldCase = await prisma.case.findUnique({ where: { id } });
      await prisma.case.update({ where: { id }, data: { status: '已撤案' } });
      await recordProgress(id, req.user.id, '批量撤案', '批量撤案操作', oldCase.status, '已撤案');
      count++;
    }
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Urge (催办)
app.post('/api/cases/:id/urge', auth, roleCheck('admin', 'supervisor'), async (req, res) => {
  try {
    const caseId = Number(req.params.id);
    await recordProgress(caseId, req.user.id, '催办', '发送催办通知', null, null);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Split case (1→N)
app.post('/api/cases/:id/split', auth, roleCheck('admin', 'supervisor'), async (req, res) => {
  try {
    const parentId = Number(req.params.id);
    const { children } = req.body; // Array: [{ title, case_type, dispatch_department_id, deadline }]

    const parent = await prisma.case.findUnique({ where: { id: parentId } });

    const created = [];
    for (const child of children) {
      const { dateStr, prefix } = generateCaseNo();
      const todayCases = await prisma.case.findMany({
        where: { case_no: { startsWith: prefix } },
      });
      const case_no = `${prefix}-${String(todayCases.length + 1).padStart(3, '0')}`;

      const newCase = await prisma.case.create({
        data: {
          case_no,
          title: child.title,
          petitioner_name: parent.petitioner_name,
          petitioner_phone: parent.petitioner_phone,
          case_type: child.case_type || parent.case_type,
          source: parent.source,
          content: `【拆分自 ${parent.case_no}】\n${child.content || parent.content}`,
          status: '新建',
          parent_id: parentId,
          is_main: false,
          dispatch_department_id: child.dispatch_department_id,
          deadline: child.deadline ? new Date(child.deadline) : parent.deadline,
        },
      });

      await recordProgress(newCase.id, req.user.id, '拆分创建', `从主案 ${parent.case_no} 拆分`, null, '新建');
      created.push(newCase);
    }

    await recordProgress(parentId, req.user.id, '拆分案件', `拆分为 ${created.length} 个子案`, parent.status, parent.status);

    res.json({ created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Merge cases (N→1)
app.post('/api/cases/merge', auth, roleCheck('admin', 'supervisor'), async (req, res) => {
  try {
    const { main_case_id, merged_case_ids } = req.body;

    // Move attachments to main case
    for (const cid of merged_case_ids) {
      await prisma.attachment.updateMany({
        where: { case_id: cid },
        data: { case_id: main_case_id },
      });
    }

    // Mark merged cases
    await prisma.case.updateMany({
      where: { id: { in: merged_case_ids } },
      data: { status: '已合并' },
    });

    // Create merge record
    await prisma.mergeRecord.create({
      data: {
        main_case_id,
        merged_case_ids: JSON.stringify(merged_case_ids),
        merged_by: req.user.id,
      },
    });

    for (const cid of merged_case_ids) {
      await recordProgress(cid, req.user.id, '合并', `合并至主案`, null, '已合并');
    }
    await recordProgress(main_case_id, req.user.id, '合并案件', `合并了 ${merged_case_ids.length} 个案件`, null, null);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Unmerge
app.post('/api/cases/:id/unmerge', auth, roleCheck('admin', 'supervisor'), async (req, res) => {
  try {
    const mainCaseId = Number(req.params.id);
    const records = await prisma.mergeRecord.findMany({
      where: { main_case_id: mainCaseId },
      orderBy: { merged_at: 'desc' },
      take: 1,
    });

    if (records.length > 0) {
      const mr = records[0];
      const mergedIds = JSON.parse(mr.merged_case_ids);
      await prisma.case.updateMany({
        where: { id: { in: mergedIds } },
        data: { status: '新建' },
      });
      await prisma.mergeRecord.delete({ where: { id: mr.id } });
      await recordProgress(mainCaseId, req.user.id, '取消合并', '取消最近一次合并操作', null, null);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== Progress ====================
app.get('/api/cases/:id/progress', auth, async (req, res) => {
  try {
    const progress = await prisma.caseProgress.findMany({
      where: { case_id: Number(req.params.id) },
      include: { operator: { select: { id: true, name: true } } },
      orderBy: { created_at: 'desc' },
    });
    res.json(progress);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== Attachments ====================
const multer = require('multer');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({ storage });

app.post('/api/cases/:id/attachments', auth, upload.array('files', 10), async (req, res) => {
  try {
    const caseId = Number(req.params.id);
    const files = req.files;
    const attachments = [];

    for (const f of files) {
      const att = await prisma.attachment.create({
        data: {
          case_id: caseId,
          filename: f.originalname,
          filepath: f.filename,
          uploader_id: req.user.id,
        },
      });
      attachments.push(att);
    }

    await recordProgress(caseId, req.user.id, '上传附件', `上传了 ${files.length} 个附件`, null, null);
    res.json(attachments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/cases/:id/attachments', auth, async (req, res) => {
  try {
    const attachments = await prisma.attachment.findMany({
      where: { case_id: Number(req.params.id) },
      orderBy: { created_at: 'desc' },
    });
    res.json(attachments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/attachments/:id/download', auth, async (req, res) => {
  try {
    const att = await prisma.attachment.findUnique({ where: { id: Number(req.params.id) } });
    res.download(path.join(__dirname, '../uploads', att.filepath), att.filename);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== Stats ====================
app.get('/api/stats/dashboard', auth, async (req, res) => {
  try {
    const [total, newCount, processing, completed, overdue] = await Promise.all([
      prisma.case.count(),
      prisma.case.count({ where: { status: '新建' } }),
      prisma.case.count({ where: { status: { in: ['已分派', '已签收', '办理中', '待审核'] } } }),
      prisma.case.count({ where: { status: '已完成' } }),
      prisma.case.count({
        where: {
          status: { in: ['已分派', '已签收', '办理中', '待审核'] },
          deadline: { lt: new Date() },
        },
      }),
    ]);

    const typeDist = await prisma.case.groupBy({
      by: ['case_type'],
      _count: true,
    });

    const sourceDist = await prisma.case.groupBy({
      by: ['source'],
      _count: true,
    });

    const statusDist = await prisma.case.groupBy({
      by: ['status'],
      _count: true,
    });

    res.json({ total, newCount, processing, completed, overdue, typeDist, sourceDist, statusDist });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stats/timeliness', auth, async (req, res) => {
  try {
    const cases = await prisma.case.findMany({
      where: { status: '已完成' },
      select: { created_at: true, updated_at: true, deadline: true },
    });

    const timeliness = cases.map(c => {
      const days = Math.ceil((c.updated_at - c.created_at) / (1000 * 60 * 60 * 24));
      const isOverdue = c.deadline && c.updated_at > c.deadline;
      return { days, isOverdue };
    });

    const avgDays = timeliness.length > 0
      ? (timeliness.reduce((s, t) => s + t.days, 0) / timeliness.length).toFixed(1)
      : 0;
    const overdueRate = timeliness.length > 0
      ? ((timeliness.filter(t => t.isOverdue).length / timeliness.length) * 100).toFixed(1)
      : 0;

    res.json({ avgDays: Number(avgDays), overdueRate: Number(overdueRate), total: timeliness.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== Departments ====================
app.get('/api/departments', auth, async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      include: {
        parent: { select: { id: true, name: true } },
        leader: { select: { id: true, name: true } },
        _count: { select: { users: true, cases: true } },
      },
      orderBy: [{ type: 'desc' }, { id: 'asc' }],
    });
    res.json(departments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/departments', auth, roleCheck('admin'), async (req, res) => {
  try {
    const dept = await prisma.department.create({ data: req.body });
    res.json(dept);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/departments/:id', auth, roleCheck('admin'), async (req, res) => {
  try {
    const dept = await prisma.department.update({
      where: { id: Number(req.params.id) },
      data: req.body,
    });
    res.json(dept);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/departments/:id', auth, roleCheck('admin'), async (req, res) => {
  try {
    await prisma.department.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== Users ====================
app.get('/api/users', auth, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: { department: { select: { id: true, name: true } } },
      orderBy: { id: 'asc' },
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', auth, roleCheck('admin'), async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const { password, ...data } = req.body;
    const password_hash = await bcrypt.hash(password || '123456', 10);
    const user = await prisma.user.create({ data: { ...data, password_hash } });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', auth, roleCheck('admin'), async (req, res) => {
  try {
    const { password, ...data } = req.body;
    if (password) {
      const bcrypt = require('bcryptjs');
      data.password_hash = await bcrypt.hash(password, 10);
    }
    const user = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data,
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', auth, roleCheck('admin'), async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== Start ====================
app.listen(PORT, () => {
  console.log(`🚀 信访管理平台后端已启动: http://localhost:${PORT}`);
});
