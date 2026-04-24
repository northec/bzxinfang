import React, { useState, useEffect } from 'react';
import { Card, Button, Row, Col, Statistic, Steps, Typography, message } from 'antd';
import { FileTextOutlined, SearchOutlined, EditOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/authcontext';

const { Title, Paragraph } = Typography;

const steps = [
  { title: '提交诉求', icon: <EditOutlined /> },
  { title: '受理审核', icon: <FileTextOutlined /> },
  { title: '案件办理', icon: <FileTextOutlined /> },
  { title: '办结反馈', icon: <CheckCircleOutlined /> },
];

const PublicHome: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>({});

  useEffect(() => {
    if (user) {
      fetch('/api/stats/dashboard', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
        .then(r => r.json())
        .then(data => setStats(data))
        .catch(() => {});
    }
  }, [user]);

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Card style={{ width: 400, textAlign: 'center' }} bordered={false}>
          <Title level={3}>滨州市住建信访平台</Title>
          <Paragraph type="secondary">请先登录后使用在线信访功能</Paragraph>
          <Button type="primary" size="large" onClick={() => navigate('/public/login')} block>
            登录 / 注册
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <Title level={2}>群众端 - 在线信访</Title>
        <Paragraph type="secondary" style={{ fontSize: 16 }}>滨州市住建领域信访管理平台</Paragraph>
      </div>

      <Card style={{ marginBottom: 24 }}>
        <Steps current={0} items={steps.map(s => ({ title: s.title, icon: s.icon }))} />
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card
            hoverable
            style={{ height: '100%', minHeight: 180 }}
            cover={<div style={{ background: 'linear-gradient(135deg, #1677ff, #4096ff)', height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <EditOutlined style={{ fontSize: 36, color: '#fff' }} />
            </div>}
          >
            <Card.Meta
              title={<span style={{ fontSize: 18 }}>提交信访诉求</span>}
              description="填写个人信息、诉求内容，上传相关材料"
            />
            <Button type="primary" style={{ marginTop: 16 }} onClick={() => navigate('/public/submit')} block>
              我要信访
            </Button>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card
            hoverable
            style={{ height: '100%', minHeight: 180 }}
            cover={<div style={{ background: 'linear-gradient(135deg, #52c41a, #73d13d)', height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SearchOutlined style={{ fontSize: 36, color: '#fff' }} />
            </div>}
          >
            <Card.Meta
              title={<span style={{ fontSize: 18 }}>查询案件进度</span>}
              description="输入手机号查询您的信访案件办理进度"
            />
            <Button style={{ marginTop: 16 }} onClick={() => navigate('/public/query')} block>
              查询进度
            </Button>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={12}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Statistic title="我的案件" value={stats.total || 0} prefix={<FileTextOutlined />} />
          </Card>
        </Col>
        <Col xs={12}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Statistic title="办理中" value={stats.processing || 0} valueStyle={{ color: '#fa8c16' }} />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginTop: 24 }} title="信访须知">
        <ul style={{ lineHeight: 2, paddingLeft: 20 }}>
          <li>请如实填写信访信息，提供真实有效的联系方式</li>
          <li>信访事项将在3个工作日内受理，请保持电话畅通</li>
          <li>案件办理期限一般为15个工作日，复杂案件可延长</li>
          <li>提交虚假信息或恶意信访将依法追究责任</li>
          <li>如有疑问可拨打信访热线：<strong>12345</strong></li>
        </ul>
      </Card>
    </div>
  );
};

export default PublicHome;