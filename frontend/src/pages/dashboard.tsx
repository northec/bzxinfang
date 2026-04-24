import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Tag, Table, List, Typography } from 'antd';
import {
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SendOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/authcontext';
import { Link } from 'react-router-dom';

const { Title } = Typography;

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>({});
  const [recentCases, setRecentCases] = useState<any[]>([]);
  const [overdueCases, setOverdueCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    try {
      const [statsRes, casesRes] = await Promise.all([
        fetch('/api/stats/dashboard', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/cases?pageSize=5', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const statsData = await statsRes.json();
      const casesData = await casesRes.json();
      setStats(statsData);
      setRecentCases(casesData.cases || []);

      // Fetch overdue cases
      if (user?.role !== 'handler') {
        const overdueRes = await fetch('/api/cases?pageSize=5&status=已分派', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const overdueData = await overdueRes.json();
        setOverdueCases((overdueData.cases || []).filter((c: any) => c.deadline && new Date(c.deadline) < new Date()));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const statusColor = (status: string) => {
    const map: Record<string, string> = {
      '新建': 'default',
      '已分派': 'processing',
      '已签收': 'purple',
      '办理中': 'warning',
      '待审核': 'cyan',
      '已完成': 'success',
      '已撤案': 'default',
      '已合并': 'blue',
    };
    return map[status] || 'default';
  };

  const overdueCount = overdueCases.length;

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>
        工作台 - {user?.name}，欢迎回来
      </Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card" style={{ background: 'linear-gradient(135deg, #1677ff, #4096ff)' }}>
            <FileTextOutlined style={{ fontSize: 28, position: 'absolute', right: 16, top: 16, opacity: 0.3 }} />
            <div className="stat-value">{stats.total || 0}</div>
            <div className="stat-label">案件总数</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card" style={{ background: 'linear-gradient(135deg, #fa8c16, #ffa940)' }}>
            <ClockCircleOutlined style={{ fontSize: 28, position: 'absolute', right: 16, top: 16, opacity: 0.3 }} />
            <div className="stat-value">{stats.newCount || 0}</div>
            <div className="stat-label">待处理案件</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card" style={{ background: 'linear-gradient(135deg, #13c2c2, #36cfc9)' }}>
            <SendOutlined style={{ fontSize: 28, position: 'absolute', right: 16, top: 16, opacity: 0.3 }} />
            <div className="stat-value">{stats.processing || 0}</div>
            <div className="stat-label">办理中</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card" style={{ background: 'linear-gradient(135deg, #52c41a, #73d13d)' }}>
            <CheckCircleOutlined style={{ fontSize: 28, position: 'absolute', right: 16, top: 16, opacity: 0.3 }} />
            <div className="stat-value">{stats.completed || 0}</div>
            <div className="stat-label">已完成</div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title="最新案件" size="small">
            <Table
              dataSource={recentCases}
              rowKey="id"
              pagination={false}
              size="small"
              columns={[
                { title: '案件编号', dataIndex: 'case_no', width: 180, render: (v: string, r: any) => <Link to={`/cases/${r.id}`}>{v}</Link> },
                { title: '标题', dataIndex: 'title', ellipsis: true },
                { title: '信访人', dataIndex: 'petitioner_name', width: 80 },
                { title: '类型', dataIndex: 'case_type', width: 80 },
                { title: '状态', dataIndex: 'status', width: 80, render: (s: string) => <Tag color={statusColor(s)}>{s}</Tag> },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          {overdueCount > 0 && (
            <Card
              title={<span style={{ color: '#ff4d4f' }}><ExclamationCircleOutlined /> 超期预警</span>}
              size="small"
              style={{ marginBottom: 16 }}
            >
              <List
                dataSource={overdueCases}
                size="small"
                renderItem={(item: any) => (
                  <List.Item>
                    <Link to={`/cases/${item.id}`} style={{ color: '#ff4d4f' }}>{item.case_no}</Link>
                    <span style={{ color: '#8c8c8c' }}>{item.title}</span>
                  </List.Item>
                )}
              />
            </Card>
          )}
          <Card title="快捷操作" size="small">
            <List size="small">
              {user?.role !== 'handler' && (
                <>
                  <List.Item><Link to="/cases/new">📝 新建案件</Link></List.Item>
                  <List.Item><Link to="/cases">📋 案件管理</Link></List.Item>
                  <List.Item><Link to="/dispatch">📤 任务分派</Link></List.Item>
                  <List.Item><Link to="/stats">📊 统计看板</Link></List.Item>
                </>
              )}
              {user?.role === 'handler' && (
                <List.Item><Link to="/my-tasks"><InboxOutlined /> 我的任务</Link></List.Item>
              )}
            </List>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
