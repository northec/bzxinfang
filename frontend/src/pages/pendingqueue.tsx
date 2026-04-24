import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Modal, Form, Select, message, Space, Breadcrumb, Descriptions } from 'antd';
import { CheckOutlined, CloseOutlined, FileTextOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/authcontext';

const statusColor: Record<string, string> = {
  '待受理': 'orange',
  '已受理': 'processing',
  '已驳回': 'error',
  '已分派': 'purple',
  '已签收': 'purple',
  '办理中': 'warning',
  '待审核': 'cyan',
  '已完成': 'success',
};

const PendingQueue: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectForm] = Form.useForm();
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const token = localStorage.getItem('token');

  const fetchCases = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cases?status=待受理&page=${page}&pageSize=15`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setCases(data.cases || []);
      setTotal(data.total || 0);
    } catch { message.error('加载失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCases(); }, [page]);

  const viewDetail = (record: any) => {
    setSelectedCase(record);
    setDetailModal(true);
  };

  const handleAccept = async (record: any) => {
    try {
      const res = await fetch(`/api/cases/${record.id}/accept-pending`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      message.success('已受理，案件进入待分派状态');
      setDetailModal(false);
      fetchCases();
    } catch (err: any) { message.error(err.message); }
  };

  const handleReject = async (values: any) => {
    try {
      const res = await fetch(`/api/cases/${selectedCase.id}/reject-pending`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: values.reason }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      message.success('已驳回');
      setRejectModal(false);
      setDetailModal(false);
      rejectForm.resetFields();
      fetchCases();
    } catch (err: any) { message.error(err.message); }
  };

  const columns = [
    {
      title: '案件编号',
      dataIndex: 'case_no',
      width: 170,
      render: (v: string, r: any) => <a onClick={() => viewDetail(r)}>{v}</a>,
    },
    { title: '标题', dataIndex: 'title', ellipsis: true },
    { title: '信访人', dataIndex: 'petitioner_name', width: 90 },
    { title: '电话', dataIndex: 'petitioner_phone', width: 120 },
    { title: '类型', dataIndex: 'case_type', width: 80, render: (v: string) => <Tag>{v}</Tag> },
    { title: '来源', dataIndex: 'source', width: 90 },
    { title: '提交时间', dataIndex: 'created_at', width: 170, render: (v: string) => v?.slice(0, 19).replace('T', ' ') },
    {
      title: '操作',
      width: 160,
      render: (_: any, r: any) => (
        <Space size="small">
          <Button type="primary" size="small" icon={<CheckOutlined />} onClick={() => handleAccept(r)} style={{ background: '#52c41a' }}>
            受理
          </Button>
          <Button danger size="small" icon={<CloseOutlined />} onClick={() => { setSelectedCase(r); setRejectModal(true); }}>
            驳回
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Breadcrumb items={[
        { title: <Link to="/"><FileTextOutlined /> 工作台</Link> },
        { title: '待受理队列' },
      ]} style={{ marginBottom: 16 }} />

      <Card title="待受理案件" size="small" extra={<Tag color="orange">{total} 件待审核</Tag>}>
        {cases.length === 0 && !loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#8c8c8c' }}>
            <ExclamationCircleOutlined style={{ fontSize: 48, marginBottom: 16, display: 'block' }} />
            暂无待受理案件
          </div>
        ) : (
          <Table
            dataSource={cases}
            rowKey="id"
            loading={loading}
            columns={columns}
            scroll={{ x: 1000 }}
            pagination={{
              current: page,
              pageSize: 15,
              total,
              showSizeChanger: false,
              showTotal: t => `共 ${t} 件`,
              onChange: p => setPage(p),
            }}
            size="small"
          />
        )}
      </Card>

      {/* 详情 Modal */}
      <Modal
        title={`案件详情 - ${selectedCase?.case_no || ''}`}
        open={detailModal}
        onCancel={() => setDetailModal(false)}
        footer={
          <Space>
            <Button type="primary" icon={<CheckOutlined />} onClick={() => handleAccept(selectedCase)} style={{ background: '#52c41a' }}>
              受理
            </Button>
            <Button danger icon={<CloseOutlined />} onClick={() => { setRejectModal(true); }}>
              驳回
            </Button>
            <Button onClick={() => setDetailModal(false)}>关闭</Button>
          </Space>
        }
        width={700}
      >
        {selectedCase && (
          <>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="案件编号">{selectedCase.case_no}</Descriptions.Item>
              <Descriptions.Item label="案件类型"><Tag>{selectedCase.case_type}</Tag></Descriptions.Item>
              <Descriptions.Item label="信访人">{selectedCase.petitioner_name}</Descriptions.Item>
              <Descriptions.Item label="联系电话">{selectedCase.petitioner_phone}</Descriptions.Item>
              <Descriptions.Item label="身份证">{selectedCase.petitioner_id_card || '-'}</Descriptions.Item>
              <Descriptions.Item label="来源">{selectedCase.source}</Descriptions.Item>
              <Descriptions.Item label="提交时间" span={2}>{selectedCase.created_at?.slice(0, 19).replace('T', ' ')}</Descriptions.Item>
              <Descriptions.Item label="诉求标题" span={2}>{selectedCase.title}</Descriptions.Item>
              <Descriptions.Item label="诉求内容" span={2}>
                <div style={{ whiteSpace: 'pre-wrap', maxHeight: 200, overflowY: 'auto' }}>{selectedCase.content}</div>
              </Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Modal>

      {/* 驳回 Modal */}
      <Modal title="驳回案件" open={rejectModal} onCancel={() => setRejectModal(false)} onOk={() => rejectForm.submit()}>
        <Form form={rejectForm} layout="vertical" onFinish={handleReject}>
          <Form.Item label="驳回原因" name="reason" rules={[{ required: true, message: '请填写驳回原因' }]}>
            <Form.TextArea rows={3} placeholder="请说明驳回原因，以便群众了解情况" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PendingQueue;