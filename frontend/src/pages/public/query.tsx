import React, { useState } from 'react';
import { Form, Input, Button, Card, Table, Tag, Steps, message, Breadcrumb, Typography } from 'antd';
import { SearchOutlined, HomeOutlined, PhoneOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/authcontext';

const { Title } = Typography;

const statusColor: Record<string, string> = {
  '待受理': 'orange',
  '已受理': 'processing',
  '已分派': 'purple',
  '已签收': 'purple',
  '办理中': 'warning',
  '待审核': 'cyan',
  '已完成': 'success',
  '已驳回': 'error',
  '已撤案': 'default',
};

const statusStep: Record<string, number> = {
  '待受理': 0,
  '已受理': 1,
  '已分派': 1,
  '已签收': 2,
  '办理中': 2,
  '待审核': 3,
  '已完成': 4,
  '已驳回': 4,
  '已撤案': 4,
};

const PublicQuery: React.FC = () => {
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [phone, setPhone] = useState('');

  const onFinish = async (values: any) => {
    setPhone(values.phone);
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/cases/search-by-phone?phone=${values.phone}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      });
      const data = await res.json();
      setCases(data.cases || []);
    } catch {
      message.error('查询失败');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: '案件编号',
      dataIndex: 'case_no',
      width: 170,
      render: (v: string, r: any) => (
        <span style={{ fontWeight: 500 }}>{v}</span>
      ),
    },
    {
      title: '诉求标题',
      dataIndex: 'title',
      ellipsis: true,
    },
    {
      title: '诉求类型',
      dataIndex: 'case_type',
      width: 100,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: '当前状态',
      dataIndex: 'status',
      width: 90,
      render: (s: string) => <Tag color={statusColor[s] || 'default'}>{s}</Tag>,
    },
    {
      title: '提交时间',
      dataIndex: 'created_at',
      width: 170,
      render: (v: string) => v?.slice(0, 19).replace('T', ' '),
    },
    {
      title: '办理部门',
      dataIndex: ['dispatchDepartment', 'name'],
      width: 150,
      render: (v: string) => v || '-',
    },
  ];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
      <Breadcrumb items={[
        { title: <Link to="/public/home"><HomeOutlined /> 首页</Link> },
        { title: '查询案件进度' },
      ]} style={{ marginBottom: 24 }} />

      <Card style={{ marginBottom: 24 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={4}><PhoneOutlined /> 输入手机号查询您的信访案件</Title>
        </div>
        <Form form={form} layout="inline" onFinish={onFinish} style={{ justifyContent: 'center' }}>
          <Form.Item name="phone" rules={[
            { required: true, message: '请输入手机号' },
            { pattern: /^1\d{10}$/, message: '手机号格式不正确' },
          ]}>
            <Input placeholder="请输入手机号" maxLength={11} style={{ width: 260 }} size="large" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" icon={<SearchOutlined />} htmlType="submit" loading={loading} size="large">
              查询
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {searched && (
        <>
          {cases.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ color: '#8c8c8c', fontSize: 16 }}>
                未找到手机号 <strong>{phone}</strong> 相关的信访记录
              </div>
              <div style={{ color: '#8c8c8c', marginTop: 8 }}>
                如有疑问请拨打信访热线：<strong>12345</strong>
              </div>
            </Card>
          ) : (
            <>
              <div style={{ marginBottom: 16, color: '#595959' }}>
                找到 <strong>{cases.length}</strong> 条案件记录（手机号：{phone}）
              </div>
              <Table
                dataSource={cases}
                rowKey="id"
                columns={columns}
                loading={loading}
                size="small"
                pagination={false}
                scroll={{ x: 900 }}
              />

              {/* 流程说明 */}
              <Card title="办理流程说明" size="small" style={{ marginTop: 24 }}>
                <Steps
                  current={statusStep[cases[0]?.status] || 0}
                  items={[
                    { title: '提交诉求' },
                    { title: '受理审核' },
                    { title: '案件办理' },
                    { title: '办结反馈' },
                  ]}
                />
                <div style={{ marginTop: 16, padding: '12px 16px', background: '#f6f8fa', borderRadius: 6, fontSize: 13 }}>
                  {cases[0]?.status === '待受理' && '您的诉求正在等待主管部门审核，请保持手机畅通。'}
                  {cases[0]?.status === '已受理' && '您的诉求已受理，主管部门正在进行处理。'}
                  {['已分派', '已签收', '办理中'].includes(cases[0]?.status) && '您的案件已分派至相关部门办理中，请耐心等待。'}
                  {cases[0]?.status === '待审核' && '案件办理完成，等待主管部门审核结案。'}
                  {cases[0]?.status === '已完成' && '您的案件已结案，感谢您的信任。'}
                  {['已驳回', '已撤案'].includes(cases[0]?.status) && '您的案件已结束，如有疑问请拨打12345咨询。'}
                </div>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default PublicQuery;