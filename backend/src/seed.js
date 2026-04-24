const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始种子数据...');

  // 创建主管部门
  const dept1 = await prisma.department.create({
    data: { name: '滨州市住建局信访办', type: '主管部门' },
  });
  const dept2 = await prisma.department.create({
    data: { name: '滨州市清欠办', type: '主管部门' },
  });

  // 创建办案科室
  const dept3 = await prisma.department.create({
    data: { name: '建筑市场监管科', type: '办案科室', parent_id: dept1.id },
  });
  const dept4 = await prisma.department.create({
    data: { name: '房地产市场监管科', type: '办案科室', parent_id: dept1.id },
  });
  const dept5 = await prisma.department.create({
    data: { name: '物业管理科', type: '办案科室', parent_id: dept1.id },
  });
  const dept6 = await prisma.department.create({
    data: { name: '市政工程科', type: '办案科室', parent_id: dept1.id },
  });
  const dept7 = await prisma.department.create({
    data: { name: '质量监督站', type: '办案科室', parent_id: dept1.id },
  });

  // 创建用户
  const adminPass = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      password_hash: adminPass,
      name: '系统管理员',
      role: 'admin',
      department_id: dept1.id,
      phone: '13900000001',
    },
  });

  const userPass = await bcrypt.hash('123456', 10);
  const supervisor = await prisma.user.create({
    data: {
      username: 'supervisor',
      password_hash: userPass,
      name: '张主任',
      role: 'supervisor',
      department_id: dept1.id,
      phone: '13900000002',
    },
  });

  const handler1 = await prisma.user.create({
    data: {
      username: 'handler1',
      password_hash: userPass,
      name: '李科长',
      role: 'handler',
      department_id: dept3.id,
      phone: '13900000003',
    },
  });

  const handler2 = await prisma.user.create({
    data: {
      username: 'handler2',
      password_hash: userPass,
      name: '王科长',
      role: 'handler',
      department_id: dept4.id,
      phone: '13900000004',
    },
  });

  const handler3 = await prisma.user.create({
    data: {
      username: 'handler3',
      password_hash: userPass,
      name: '赵科长',
      role: 'handler',
      department_id: dept5.id,
      phone: '13900000005',
    },
  });

  const handler4 = await prisma.user.create({
    data: {
      username: 'handler4',
      password_hash: userPass,
      name: '刘科长',
      role: 'handler',
      department_id: dept6.id,
      phone: '13900000006',
    },
  });

  // 设置部门负责人
  await prisma.department.update({
    where: { id: dept1.id },
    data: { leader_id: supervisor.id },
  });
  await prisma.department.update({
    where: { id: dept3.id },
    data: { leader_id: handler1.id },
  });

  // 创建示例案件
  const caseTypes = ['清欠', '房产', '物业', '市政', '其他'];
  const sources = ['12345', '小程序', '国务院督查', '信访局', '其他'];
  const statuses = ['新建', '已分派', '已签收', '办理中', '待审核', '已完成'];
  const sampleCases = [
    {
      title: '滨城区XX小区拖欠农民工工资',
      petitioner_name: '张三',
      petitioner_phone: '13800001111',
      case_type: '清欠',
      source: '12345',
      content: '滨城区XX小区开发商拖欠农民工工资共计120万元，涉及农民工35人，从2025年10月起至今未支付。',
      status: '已分派',
      dispatch_department_id: dept3.id,
      handler_id: handler1.id,
      deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'XX楼盘延期交房问题',
      petitioner_name: '李四',
      petitioner_phone: '13800002222',
      case_type: '房产',
      source: '小程序',
      content: 'XX楼盘合同约定2024年12月交房，至今仍未交房，开发商未给出合理解释。',
      status: '办理中',
      dispatch_department_id: dept4.id,
      handler_id: handler2.id,
      deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'XX小区物业费收取不合理',
      petitioner_name: '王五',
      petitioner_phone: '13800003333',
      case_type: '物业',
      source: '12345',
      content: 'XX小区物业服务质量差，绿化无人维护，电梯频繁故障，但物业费持续上涨。',
      status: '待审核',
      dispatch_department_id: dept5.id,
      handler_id: handler3.id,
      deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'XX路段路面破损严重',
      petitioner_name: '赵六',
      petitioner_phone: '13800004444',
      case_type: '市政',
      source: '信访局',
      content: 'XX路段路面破损严重，多处坑洼，影响正常通行，存在安全隐患。',
      status: '新建',
    },
    {
      title: 'XX小区房屋质量问题',
      petitioner_name: '孙七',
      petitioner_phone: '13800005555',
      case_type: '房产',
      source: '国务院督查',
      content: 'XX小区多户业主反映房屋存在墙体开裂、渗水等质量问题，开发商拒绝维修。',
      status: '已签收',
      dispatch_department_id: dept7.id,
      deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'XX工地施工噪音扰民',
      petitioner_name: '周八',
      petitioner_phone: '13800006666',
      case_type: '市政',
      source: '12345',
      content: 'XX工地夜间施工噪音严重，影响周边居民正常休息，多次投诉无果。',
      status: '已完成',
      dispatch_department_id: dept6.id,
      handler_id: handler4.id,
    },
    {
      title: 'XX小区绿化带被侵占',
      petitioner_name: '吴九',
      petitioner_phone: '13800007777',
      case_type: '物业',
      source: '小程序',
      content: 'XX小区一楼业主私自侵占公共绿化带，改建为私家花园，物业不作为。',
      status: '已撤案',
    },
    {
      title: 'XX项目拖欠工程款',
      petitioner_name: '郑十',
      petitioner_phone: '13800008888',
      case_type: '清欠',
      source: '信访局',
      content: 'XX市政项目施工方反映建设单位拖欠工程款800万元，多次催要未果。',
      status: '办理中',
      dispatch_department_id: dept3.id,
      handler_id: handler1.id,
      deadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  ];

  for (let i = 0; i < sampleCases.length; i++) {
    const c = sampleCases[i];
    const dateStr = new Date(Date.now() - (sampleCases.length - i) * 3 * 24 * 60 * 60 * 1000);
    const datePart = dateStr.toISOString().slice(0, 10).replace(/-/g, '');
    const caseNo = `BZ-${datePart}-${String(i + 1).padStart(3, '0')}`;

    const caseData = {
      ...c,
      case_no: caseNo,
    };

    await prisma.case.create({ data: caseData });
  }

  console.log('✅ 种子数据创建完成');
  console.log('📋 管理员账号: admin / admin123');
  console.log('📋 主管部门账号: supervisor / 123456');
  console.log('📋 办案科室账号: handler1~handler4 / 123456');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
