const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const names = ['王伟', '李娜', '张杰', '刘洋', '陈静', '杨帆', '赵雷', '周涛', '吴倩', '孙浩', '马超', '朱琳', '胡鹏', '林峰', '何雪', '许晴', '曾敏', '韩冰', '卢军', '梁文'];
const phones = ['13800001001', '13800001002', '13800001003', '13800001004', '13800001005', '13800001006', '13800001007', '13800001008', '13800001009', '13800001010', '13800001011', '13800001012', '13800001013', '13800001014', '13800001015', '13800001016', '13800001017', '13800001018', '13800001019', '13800001020'];
const caseTypes = ['清欠', '房产', '物业', '市政', '质量', '其他'];
const sources = ['群众端', '12345', '小程序', '国务院督查', '信访局'];
const statuses = ['待受理', '新建', '已分派', '已签收', '办理中', '待审核', '已完成', '已驳回'];
const titles = [
  'XX小区拖欠农民工工资问题', 'XX楼盘延期交房要求退款', 'XX小区物业费不合理投诉', 'XX路段路面破损无人维修', 'XX小区房屋墙体开裂渗水',
  'XX工地夜间施工噪音扰民', 'XX小区绿化被私自侵占', 'XX项目拖欠工程款纠纷', 'XX业主委员会换届选举争议', 'XX小区消防通道被占用',
  'XX电梯故障频繁存在隐患', 'XX小区停车费上涨过快', 'XX房产中介收取费用过高', 'XX楼盘虚假宣传要求赔偿', 'XX物业服务质量不达标',
  'XX小区供暖温度不达标', 'XX道路路灯长期不亮', 'XX小区违建投诉无人处理', 'XX楼盘烂尾业主维权', 'XX物业强制收取装修押金',
  'XX小区垃圾清理不及时', 'XX工地扬尘污染严重', 'XX楼盘合同陷阱欺诈', 'XX物业占用公共收益', 'XX小区业委会选举违规',
];

const departments = [
  { name: '建筑市场监管科', type: '办案科室' },
  { name: '房地产市场监管科', type: '办案科室' },
  { name: '物业管理科', type: '办案科室' },
  { name: '市政工程科', type: '办案科室' },
  { name: '质量监督站', type: '办案科室' },
];

const contentTemplates = [
  '我是XX小区的业主，反映上述问题。具体情况如下：小区建成于2020年，共有住户500余户。问题持续已有半年时间，期间多次向物业反映未得到处理。希望主管部门重视，协调解决。',
  '本人于2024年3月购买XX房产，合同约定2024年12月交房，但至今未收到收房通知。开发商以各种理由推脱，未给出明确交房时间。本人租房居住，经济压力很大。',
  'XX工地每天施工到凌晨2点，噪音严重扰民，影响周边居民正常休息。家中老人孩子无法入睡，白天无法正常工作学习。多次投诉无果。',
  'XX小区物业服务质量差，绿化无人维护，电梯频繁故障，但物业费持续上涨，从每平2元涨到3.5元。物业服务与收费严重不符。',
];

function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randDate(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysAgo));
  return d;
}

function generateCaseNo(dateStr, seq) {
  return `BZ-${dateStr}-${String(seq).padStart(3, '0')}`;
}

async function main() {
  console.log('🧹 清理旧测试数据...');
  await prisma.caseProgress.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.case.deleteMany();

  console.log('📦 生成模拟数据...');
  const depts = await prisma.department.findMany({ where: { type: '办案科室' } });
  const users = await prisma.user.findMany({ where: { role: 'handler' } });

  let count = 0;
  const usedTitles = [...titles];

  for (let i = 0; i < 60; i++) {
    const date = randDate(60);
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const status = rand(statuses);
    const caseType = rand(caseTypes);
    const dept = rand(depts);
    const user = rand(users);
    const title = rand(usedTitles);
    usedTitles.splice(usedTitles.indexOf(title), 1);
    if (usedTitles.length === 0) usedTitles.push(...titles);

    // 案件编号：同一天的序列号
    const todayCases = await prisma.case.count({
      where: { case_no: { startsWith: `BZ-${dateStr}` } },
    });
    const caseNo = generateCaseNo(dateStr, todayCases + 1);

    const caseData = {
      case_no: caseNo,
      title,
      petitioner_name: rand(names),
      petitioner_phone: rand(phones),
      case_type: caseType,
      source: rand(sources),
      content: rand(contentTemplates),
      status,
      dispatch_department_id: ['新建', '已分派', '已签收', '办理中', '待审核', '已完成'].includes(status) ? dept.id : null,
      handler_id: ['已签收', '办理中', '待审核', '已完成'].includes(status) ? user.id : null,
      deadline: status !== '已完成' && status !== '已驳回' && Math.random() > 0.3
        ? new Date(Date.now() + Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000)
        : null,
      created_at: date,
      updated_at: new Date(date.getTime() + Math.floor(Math.random() * 5) * 24 * 60 * 60 * 1000),
    };

    const c = await prisma.case.create({ data: caseData });
    count++;

    // 进度记录
    const progressActions = {
      '待受理': ['群众提交'],
      '新建': ['群众提交', '受理案件'],
      '已分派': ['群众提交', '受理案件', '分派案件'],
      '已签收': ['群众提交', '受理案件', '分派案件', '签收案件'],
      '办理中': ['群众提交', '受理案件', '分派案件', '签收案件', '开始办理'],
      '待审核': ['群众提交', '受理案件', '分派案件', '签收案件', '开始办理', '提交审核'],
      '已完成': ['群众提交', '受理案件', '分派案件', '签收案件', '开始办理', '提交审核', '完成结案'],
      '已驳回': ['群众提交', '受理案件', '驳回受理'],
    };

    const actions = progressActions[status] || [];
    for (let j = 0; j < actions.length; j++) {
      const actionDate = new Date(date.getTime() + j * 2 * 60 * 60 * 1000);
      await prisma.caseProgress.create({
        data: {
          case_id: c.id,
          operator_id: status === '群众提交' ? c.id : 2,
          action: actions[j],
          description: `${actions[j]} - ${caseNo}`,
          new_status: j === actions.length - 1 ? status : null,
          created_at: actionDate,
        },
      });
    }
  }

  console.log(`✅ 已生成 ${count} 条模拟案件数据`);
  console.log('');
  console.log('📊 数据统计:');
  const stats = await prisma.case.groupBy({
    by: ['status'],
    _count: true,
  });
  for (const s of stats) {
    console.log(`  ${s.status}: ${s._count} 件`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());