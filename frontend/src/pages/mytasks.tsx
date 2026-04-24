import React, { useState, useEffect } from 'react';
import { Table, Card, Tag, Button, Modal, Form, Input, Descriptions, message, Upload, Timeline, Breadcrumb } from 'antd';
import { useNavigate, Link } from 'react-router-dom';
import { HomeOutlined, CheckCircleOutlined, UploadOutlined } from '@ant-design/icons';

const statusColor: Record<string, string> = {
  '已分派': 'processing', '已签收': 'purple',
  '办理中': 'warning', '待审核': 'cyan', '已完成': 'success',
};

const MyTasks: React.FC = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [processModal, setProcessModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [progress, setProgress] = useState<any[]>([]);
  const [processForm] = Form.useForm();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cases/my-tasks', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setTasks(data.cases || []);
    } catch { message.error('加载失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTasks(); }, []);

  const handleAccept = async (id: number) => {
    await fetch(`/api/cases/${id}/status`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: '已签收' }),
    });
    message.success('已签收');
    fetchTasks();
  };

  const handleStart = async (id: number) => {
    await fetch(`/api/cases/${id}/status`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: '办理中' }),
    });
    message.success('开始办理');
    fetchTasks();
  };

  const handleProcessSubmit = async (values: any) => {
    try {
      await fetch(`/api/cases/${selectedTask?.id}/process`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(values),
      });
      message.success('办理意见已提交');
      setProcessModal(false);
      processForm.resetFields();
      fetchTasks();
    } catch { message.error('提交失败'); }
  };

  const handleSubmitReview = async (id: number) => {
    await fetch(`/api/cases/${id}/status`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: '待审核' }),
    });
    message.success('已提交审核');
    fetchTasks();
  };

  const viewDetail = async (task: any) => {
    setSelectedTask(task);
    setDetailModal(true);
    try {
      const res = await fetch(`/api/cases/${task.id}/progress`, { headers: { Authorization: `Bearer ${token}` } });
      setProgress(await res.json());
    } catch { setProgress([]); }
  };

  const columns = [
    { title: '案件编号', dataIndex: 'case_no', width: 170, render: (v: string, r: any) => <Link to={`/cases/${r.id}`}>{v}</Link> },
    { title: '标题', dataIndex: 'title', ellipsis: true },
    { title: '信访人', dataIndex: 'petitioner_name', width: 80 },
    { title: '类型', dataIndex: 'case_type', width: 70, render: (v: string) => <Tag>{v}</Tag> },
    { title: '状态', dataIndex: 'status', width: 80, render: (s: string) => <Tag color={statusColor[s]}>{s}</Tag> },
    { title: '办结时限', dataIndex: 'deadline', width: 110, render: (v: string) => {
      if (!v) return '-';
      const overdue = new Date(v) < new Date();
      return <span style={{ color: overdue ? '#ff4d4f' : undefined }}>{v?.split('T')[0]}</span>;
    }},
    {
      title: '操作', width: 220,
      render: (_: any, r: any) => (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <Button type="link" size="small" onClick={() => viewDetail(r)}>详情</Button>
          {r.status === '已分派' && <Button type="primary" size="small" onClick={() => handleAccept(r.id)}>签收</Button>}
          {r.status === '已签收' && <Button type="primary" size="small" onClick={() => handleStart(r.id)}>开始办理</Button>}
          {r.status === '办理中' && <Button size="small" onClick={() => { setSelectedTask(r); setProcessModal(true); }}>填写意见</Button>}
          {r.status === '办理中' && <Button type="primary" size="small" icon={<CheckCircleOutlined />} onClick={() => handleSubmitReview(r.id)}>提交审核</Button>}
        </div>
      )
    },
  ];

  return (
    <div>
      <Breadcrumb items={[
        { title: <><HomeOutlined /> 工作台</>, onClick: () => navigate('/') },
        { title: '我的任务' },
      ]} style={{ marginBottom: 16 }} />
      <Card title="我的任务" size="small" extra={<Button onClick={fetchTasks}>刷新</Button>}>
        <Table dataSource={tasks} rowKey="id" loading={loading} columns={columns} size="small"
          pagination={{ showTotal: t => `共 ${t} 条任务` }} />
      </Card>

      <Modal title={`办理进度 - ${selectedTask?.case_no || ''}`} open={detailModal} onCancel={() => setDetailModal(false)} footer={null} width={600}>
        <Descriptions bordered size="small" column={1}>
          <Descriptions.Item label="标题">{selectedTask?.title}</Descriptions.Item>
          <Descriptions.Item label="信访人">{selectedTask?.petitioner_name}</Descriptions.Item>
          <Descriptions.Item label="诉求">{selectedTask?.content}</Descriptions.Item>
        </Descriptions>
        <div style={{ marginTop: 16 }}>
          <h4>办理进度</h4>
          {progress.length === 0 ? <div style={{ color: '#8c8c8c' }}>暂无记录</div> : (
            <Timeline items={progress.map((p: any) => ({
              children: <div><strong>{p.action}</strong> - {p.operator?.name} · {new Date(p.created_at).toLocaleString('zh-CN')}</div>
            }))} />
          )}
        </div>
      </Modal>

      <Modal title="填写办理意见" open={processModal} onCancel={() => setProcessModal(false)} onOk={() => processForm.submit()}>
        <Form form={processForm} layout="vertical" onFinish={handleProcessSubmit}>
          <Form.Item name="opinion" label="办理意见" rules={[{ required: true }]}>
            <Input.TextArea rows={4} placeholder="请输入办理意见" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MyTasks;
