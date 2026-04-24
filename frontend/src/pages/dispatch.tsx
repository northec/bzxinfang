import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Modal, Form, Select, DatePicker, message, Space, Badge } from 'antd';
import { SendOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/authcontext';

const statusColor: Record<string, string> = {
  '新建': 'default', '已分派': 'processing', '已签收': 'purple',
  '办理中': 'warning', '待审核': 'cyan', '已完成': 'success',
  '已撤案': 'default', '已合并': 'blue',
};

const Dispatch: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentCase, setCurrentCase] = useState<any>(null);
  const [form] = Form.useForm();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchDepartments();
    fetchData();
  }, [page, pageSize]);

  // Auto-open dispatch modal if caseId in URL
  useEffect(() => {
    const caseId = searchParams.get('caseId');
    if (caseId) {
      const found = data.find(c => c.id === Number(caseId));
      if (found) openDispatchModal(found);
    }
  }, [data]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cases?status=新建&page=${page}&pageSize=${pageSize}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setData(json.cases || []);
      setTotal(json.total || 0);
    } catch {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setDepartments((data || []).filter((d: any) => d.type === '办案科室'));
    } catch {}
  };

  const openDispatchModal = (record: any) => {
    setCurrentCase(record);
    form.resetFields();
    setModalOpen(true);
  };

  const handleDispatch = async (values: any) => {
    try {
      const res = await fetch(`/api/cases/${currentCase.id}/dispatch`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dispatch_department_id: values.department_id,
          co_departments: values.co_departments || [],
          deadline: values.deadline?.toISOString(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      message.success('分派成功');
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      message.error(err.message || '分派失败');
    }
  };

  const columns = [
    {
      title: '案件编号',
      dataIndex: 'case_no',
      width: 170,
      render: (v: string, r: any) => <a onClick={() => navigate(`/cases/${r.id}`)}>{v}</a>,
    },
    { title: '标题', dataIndex: 'title', ellipsis: true },
    { title: '信访人', dataIndex: 'petitioner_name', width: 90 },
    { title: '类型', dataIndex: 'case_type', width: 80, render: (v: string) => <Tag>{v}</Tag> },
    { title: '来源', dataIndex: 'source', width: 100 },
    { title: '状态', dataIndex: 'status', width: 90, render: (s: string) => <Tag color={statusColor[s]}>{s}</Tag> },
    { title: '创建时间', dataIndex: 'created_at', width: 170, render: (v: string) => v?.slice(0, 19).replace('T', ' ') },
    {
      title: '操作',
      width: 100,
      render: (_: any, r: any) => (
        <Button type="primary" size="small" icon={<SendOutlined />} onClick={() => openDispatchModal(r)}>分派</Button>
      ),
    },
  ];

  return (
    <div>
      <Card
        title={
          <Space>
            <SendOutlined />
            <span>任务分派</span>
            <Badge count={total} style={{ backgroundColor: '#1677ff' }} />
          </Space>
        }
        size="small"
      >
        {total === 0 && !loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#8c8c8c' }}>
            <ExclamationCircleOutlined style={{ fontSize: 48, marginBottom: 16, display: 'block' }} />
            暂无待分派案件
          </div>
        ) : (
          <Table
            dataSource={data}
            rowKey="id"
            columns={columns}
            loading={loading}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              showTotal: t => `共 ${t} 条`,
              onChange: (p, ps) => { setPage(p); setPageSize(ps); },
            }}
          />
        )}
      </Card>

      <Modal
        title={`分派案件 - ${currentCase?.case_no || ''}`}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        destroyOnClose
      >
        {currentCase && (
          <div style={{ marginBottom: 16, padding: 12, background: '#f6f8fa', borderRadius: 6 }}>
            <div><strong>{currentCase.title}</strong></div>
            <div style={{ color: '#8c8c8c', fontSize: 13 }}>
              信访人: {currentCase.petitioner_name} | 电话: {currentCase.petitioner_phone} | 类型: {currentCase.case_type}
            </div>
          </div>
        )}
        <Form form={form} layout="vertical" onFinish={handleDispatch}>
          <Form.Item label="主办科室" name="department_id" rules={[{ required: true, message: '请选择主办科室' }]}>
            <Select placeholder="选择主办科室" options={departments.map(d => ({ label: d.name, value: d.id }))} showSearch optionFilterProp="label" />
          </Form.Item>
          <Form.Item label="协办科室" name="co_departments">
            <Select mode="multiple" placeholder="选择协办科室（可选）" options={departments.map(d => ({ label: d.name, value: d.id }))} />
          </Form.Item>
          <Form.Item label="办结时限" name="deadline">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Dispatch;
