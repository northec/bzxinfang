import React, { useState, useEffect } from 'react';
import {
  Card, Descriptions, Tag, Button, Space, Timeline, Modal, Form,
  Input, Select, DatePicker, message, Upload, Table, Divider, Popconfirm, Spin,
  Row, Col, Alert, Tabs,
} from 'antd';
import {
  ArrowLeftOutlined, SendOutlined, CheckOutlined, EditOutlined,
  AuditOutlined, CheckCircleOutlined, BellOutlined, ScissorOutlined,
  MergeOutlined, UploadOutlined, DownloadOutlined, PaperClipOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/authcontext';

const { TextArea } = Input;

const statusColor: Record<string, string> = {
  '新建': 'default', '已分派': 'processing', '已签收': 'purple',
  '办理中': 'warning', '待审核': 'cyan', '已完成': 'success',
  '已撤案': 'default', '已合并': 'blue',
};

const CaseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<any[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);

  // Modals
  const [dispatchModal, setDispatchModal] = useState(false);
  const [processModal, setProcessModal] = useState(false);
  const [reviewModal, setReviewModal] = useState(false);
  const [splitModal, setSplitModal] = useState(false);
  const [mergeModal, setMergeModal] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [allCases, setAllCases] = useState<any[]>([]);

  const [dispatchForm] = Form.useForm();
  const [processForm] = Form.useForm();
  const [reviewForm] = Form.useForm();
  const [rejectForm] = Form.useForm();
  const [splitForm] = Form.useForm();
  const [mergeForm] = Form.useForm();

  const token = localStorage.getItem('token');
  const isAdmin = user?.role === 'admin' || user?.role === 'supervisor';
  const isHandler = user?.role === 'handler';

  useEffect(() => {
    if (id) fetchAll();
  }, [id]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [caseRes, progressRes, attRes, deptRes] = await Promise.all([
        fetch(`/api/cases/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/cases/${id}/progress`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/cases/${id}/attachments`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/departments', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [c, p, a, d] = await Promise.all([caseRes.json(), progressRes.json(), attRes.json(), deptRes.json()]);
      setCaseData(c);
      setProgress(p || []);
      setAttachments(a || []);
      setDepartments((d || []).filter((dept: any) => dept.type === '办案科室'));
    } catch {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const post = async (url: string, body?: any) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  };

  const handleDispatch = async (values: any) => {
    try {
      await post(`/api/cases/${id}/dispatch`, {
        dispatch_department_id: values.department_id,
        co_departments: values.co_departments || [],
        deadline: values.deadline?.toISOString(),
      });
      message.success('分派成功');
      setDispatchModal(false);
      dispatchForm.resetFields();
      fetchAll();
    } catch (err: any) { message.error(err.message); }
  };

  const handleAccept = async () => {
    try {
      await post(`/api/cases/${id}/accept`);
      message.success('签收成功');
      fetchAll();
    } catch (err: any) { message.error(err.message); }
  };

  const handleProcess = async (values: any) => {
    try {
      await post(`/api/cases/${id}/process`, { description: values.description });
      message.success('办理意见已提交');
      setProcessModal(false);
      processForm.resetFields();
      fetchAll();
    } catch (err: any) { message.error(err.message); }
  };

  const handleSubmitReview = async (values: any) => {
    try {
      await post(`/api/cases/${id}/submit-review`, { result: values.result });
      message.success('已提交审核');
      setReviewModal(false);
      reviewForm.resetFields();
      fetchAll();
    } catch (err: any) { message.error(err.message); }
  };

  const handleComplete = async () => {
    try {
      await post(`/api/cases/${id}/complete`);
      message.success('结案成功');
      fetchAll();
    } catch (err: any) { message.error(err.message); }
  };

  const handleReject = async (values: any) => {
    try {
      await post(`/api/cases/${id}/reject`, { reason: values.reason });
      message.success('已驳回');
      setRejectModal(false);
      rejectForm.resetFields();
      fetchAll();
    } catch (err: any) { message.error(err.message); }
  };

  const handleUrge = async () => {
    try {
      await post(`/api/cases/${id}/urge`);
      message.success('催办通知已发送');
      fetchAll();
    } catch (err: any) { message.error(err.message); }
  };

  const handleSplit = async (values: any) => {
    try {
      const children = values.children.map((c: any) => ({
        title: c.title,
        case_type: c.case_type || caseData.case_type,
        dispatch_department_id: c.department_id,
        deadline: c.deadline?.toISOString(),
        content: c.content,
      }));
      await post(`/api/cases/${id}/split`, { children });
      message.success('拆分成功');
      setSplitModal(false);
      splitForm.resetFields();
      fetchAll();
    } catch (err: any) { message.error(err.message); }
  };

  const openMergeModal = async () => {
    try {
      const res = await fetch(`/api/cases?pageSize=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setAllCases((data.cases || []).filter((c: any) => c.id !== Number(id) && c.status !== '已完成' && c.status !== '已撤案' && c.status !== '已合并'));
      setMergeModal(true);
    } catch { message.error('加载案件列表失败'); }
  };

  const handleMerge = async (values: any) => {
    try {
      await post('/api/cases/merge', {
        main_case_id: Number(id),
        merged_case_ids: values.case_ids,
      });
      message.success('合并成功');
      setMergeModal(false);
      mergeForm.resetFields();
      fetchAll();
    } catch (err: any) { message.error(err.message); }
  };

  const handleUpload = async (info: any) => {
    const file = info.file;
    const formData = new FormData();
    formData.append('files', file);
    const res = await fetch(`/api/cases/${id}/attachments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (res.ok) {
      message.success('上传成功');
      fetchAll();
    } else {
      message.error('上传失败');
    }
  };

  const actionColor = (action: string) => {
    const map: Record<string, string> = {
      '新建案件': '#1677ff', '分派案件': '#722ed1', '签收案件': '#13c2c2',
      '开始办理': '#fa8c16', '提交审核': '#1677ff', '完成结案': '#52c41a',
      '撤案': '#8c8c8c', '催办': '#ff4d4f', '拆分案件': '#2f54eb',
      '合并案件': '#2f54eb', '驳回': '#ff4d4f', '上传附件': '#1677ff',
    };
    return map[action] || '#1677ff';
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>;
  if (!caseData) return <div>案件不存在</div>;

  const isOverdue = caseData.deadline && caseData.status !== '已完成' && caseData.status !== '已撤案' && new Date(caseData.deadline) < new Date();

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>返回</Button>
        {caseData.parent && (
          <Tag color="blue">父案: <a onClick={() => navigate(`/cases/${caseData.parent.id}`)}>{caseData.parent.case_no}</a></Tag>
        )}
        {isOverdue && <Tag color="red" className="overdue-badge">⚠ 超期</Tag>}
      </Space>

      {/* 基本信息卡片 */}
      <Card
        title={`案件详情 - ${caseData.case_no}`}
        size="small"
        extra={
          <Space>
            {isAdmin && caseData.status === '新建' && (
              <Button type="primary" icon={<SendOutlined />} onClick={() => setDispatchModal(true)}>分派</Button>
            )}
            {isHandler && caseData.status === '已分派' && (
              <Button type="primary" icon={<CheckOutlined />} onClick={handleAccept}>签收</Button>
            )}
            {(isAdmin || isHandler) && ['已签收', '办理中'].includes(caseData.status) && (
              <Button icon={<EditOutlined />} onClick={() => setProcessModal(true)}>填写办理意见</Button>
            )}
            {(isAdmin || isHandler) && ['办理中', '已签收'].includes(caseData.status) && (
              <Button icon={<AuditOutlined />} onClick={() => setReviewModal(true)}>提交审核</Button>
            )}
            {isAdmin && caseData.status === '待审核' && (
              <>
                <Popconfirm title="确定结案？" onConfirm={handleComplete}>
                  <Button type="primary" icon={<CheckCircleOutlined />} style={{ background: '#52c41a' }}>结案</Button>
                </Popconfirm>
                <Button danger onClick={() => setRejectModal(true)}>驳回</Button>
              </>
            )}
            {isAdmin && ['已分派', '已签收', '办理中', '待审核'].includes(caseData.status) && (
              <Button icon={<BellOutlined />} onClick={handleUrge}>催办</Button>
            )}
            {isAdmin && caseData.is_main && caseData.status !== '已合并' && (
              <Button icon={<ScissorOutlined />} onClick={() => setSplitModal(true)}>拆分</Button>
            )}
            {isAdmin && caseData.is_main && caseData.status !== '已合并' && (
              <Button icon={<MergeOutlined />} onClick={openMergeModal}>合并</Button>
            )}
          </Space>
        }
      >
        {isOverdue && (
          <Alert type="error" message="该案件已超过办结时限！" showIcon style={{ marginBottom: 16 }} />
        )}
        <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }} size="small">
          <Descriptions.Item label="案件编号">{caseData.case_no}</Descriptions.Item>
          <Descriptions.Item label="案件标题">{caseData.title}</Descriptions.Item>
          <Descriptions.Item label="当前状态">
            <Tag color={statusColor[caseData.status]}>{caseData.status}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="信访人">{caseData.petitioner_name}</Descriptions.Item>
          <Descriptions.Item label="联系电话">{caseData.petitioner_phone}</Descriptions.Item>
          <Descriptions.Item label="案件类型"><Tag>{caseData.case_type}</Tag></Descriptions.Item>
          <Descriptions.Item label="来源渠道">{caseData.source}</Descriptions.Item>
          <Descriptions.Item label="主办科室">{caseData.dispatchDepartment?.name || '-'}</Descriptions.Item>
          <Descriptions.Item label="经办人">{caseData.handler?.name || '-'}</Descriptions.Item>
          <Descriptions.Item label="办结时限">
            <span style={{ color: isOverdue ? '#ff4d4f' : undefined }}>
              {isOverdue && '⚠ '}{caseData.deadline?.slice(0, 10) || '-'}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">{caseData.created_at?.slice(0, 19).replace('T', ' ')}</Descriptions.Item>
          <Descriptions.Item label="更新时间">{caseData.updated_at?.slice(0, 19).replace('T', ' ')}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Tabs
        style={{ marginTop: 16 }}
        items={[
          {
            key: 'content',
            label: '诉求内容',
            children: (
              <Card size="small">
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{caseData.content}</div>
              </Card>
            ),
          },
          {
            key: 'progress',
            label: `办理进度 (${progress.length})`,
            children: (
              <Card size="small">
                {progress.length === 0 ? (
                  <div style={{ color: '#8c8c8c', textAlign: 'center', padding: 24 }}>暂无进度记录</div>
                ) : (
                  <Timeline
                    items={progress.map((p: any) => ({
                      color: actionColor(p.action),
                      children: (
                        <div>
                          <div><strong>{p.action}</strong> <Tag>{p.new_status || p.old_status || ''}</Tag></div>
                          <div style={{ color: '#595959', fontSize: 13 }}>{p.description}</div>
                          <div style={{ color: '#8c8c8c', fontSize: 12 }}>
                            {p.operator?.name} · {p.created_at?.slice(0, 19).replace('T', ' ')}
                          </div>
                        </div>
                      ),
                    }))}
                  />
                )}
              </Card>
            ),
          },
          {
            key: 'attachments',
            label: `附件 (${attachments.length})`,
            children: (
              <Card size="small">
                <Upload.Dragger
                  customRequest={({ file }) => handleUpload({ file })}
                  showUploadList={false}
                  multiple
                >
                  <p><UploadOutlined style={{ fontSize: 28, color: '#1677ff' }} /></p>
                  <p>点击或拖拽文件上传</p>
                </Upload.Dragger>
                <Divider>附件列表</Divider>
                {attachments.length === 0 ? (
                  <div style={{ color: '#8c8c8c', textAlign: 'center' }}>暂无附件</div>
                ) : (
                  <Table
                    dataSource={attachments}
                    rowKey="id"
                    size="small"
                    pagination={false}
                    columns={[
                      { title: '文件名', dataIndex: 'filename', render: (v: string, r: any) => (
                        <a href={`/api/attachments/${r.id}/download`} target="_blank" rel="noopener">
                          <PaperClipOutlined /> {v}
                        </a>
                      )},
                      { title: '上传时间', dataIndex: 'created_at', width: 180, render: (v: string) => v?.slice(0, 19).replace('T', ' ') },
                    ]}
                  />
                )}
              </Card>
            ),
          },
          ...(caseData.children?.length > 0 ? [{
            key: 'children',
            label: `子案 (${caseData.children.length})`,
            children: (
              <Card size="small">
                <Table
                  dataSource={caseData.children}
                  rowKey="id"
                  size="small"
                  pagination={false}
                  columns={[
                    { title: '子案编号', dataIndex: 'case_no', render: (v: string, r: any) => <a onClick={() => navigate(`/cases/${r.id}`)}>{v}</a> },
                    { title: '状态', dataIndex: 'status', render: (s: string) => <Tag color={statusColor[s]}>{s}</Tag> },
                    { title: '经办人', dataIndex: ['handler', 'name'], render: (v: string) => v || '-' },
                  ]}
                />
              </Card>
            ),
          }] : []),
        ]}
      />

      {/* 分派 Modal */}
      <Modal title="分派案件" open={dispatchModal} onCancel={() => setDispatchModal(false)} onOk={() => dispatchForm.submit()} destroyOnClose>
        <Form form={dispatchForm} layout="vertical" onFinish={handleDispatch}>
          <Form.Item label="主办科室" name="department_id" rules={[{ required: true, message: '请选择主办科室' }]}>
            <Select placeholder="选择主办科室" options={departments.map(d => ({ label: d.name, value: d.id }))} />
          </Form.Item>
          <Form.Item label="协办科室" name="co_departments">
            <Select mode="multiple" placeholder="选择协办科室（可选）" options={departments.map(d => ({ label: d.name, value: d.id }))} />
          </Form.Item>
          <Form.Item label="办结时限" name="deadline">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 办理意见 Modal */}
      <Modal title="填写办理意见" open={processModal} onCancel={() => setProcessModal(false)} onOk={() => processForm.submit()} destroyOnClose>
        <Form form={processForm} layout="vertical" onFinish={handleProcess}>
          <Form.Item label="办理意见" name="description" rules={[{ required: true, message: '请填写办理意见' }]}>
            <TextArea rows={4} placeholder="请填写办理意见" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 提交审核 Modal */}
      <Modal title="提交审核" open={reviewModal} onCancel={() => setReviewModal(false)} onOk={() => reviewForm.submit()} destroyOnClose>
        <Form form={reviewForm} layout="vertical" onFinish={handleSubmitReview}>
          <Form.Item label="办理结果" name="result" rules={[{ required: true, message: '请填写办理结果' }]}>
            <TextArea rows={4} placeholder="请填写办理结果" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 驳回 Modal */}
      <Modal title="驳回" open={rejectModal} onCancel={() => setRejectModal(false)} onOk={() => rejectForm.submit()} destroyOnClose>
        <Form form={rejectForm} layout="vertical" onFinish={handleReject}>
          <Form.Item label="驳回原因" name="reason" rules={[{ required: true, message: '请填写驳回原因' }]}>
            <TextArea rows={3} placeholder="请填写驳回原因" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 拆分 Modal */}
      <Modal title="拆分案件" open={splitModal} onCancel={() => setSplitModal(false)} onOk={() => splitForm.submit()} width={700} destroyOnClose>
        <Form form={splitForm} layout="vertical" onFinish={handleSplit}>
          <Form.List name="children" initialValue={[{}]}>
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, ...rest }) => (
                  <Card key={key} size="small" title={`子案 ${key + 1}`} style={{ marginBottom: 12 }}
                    extra={fields.length > 1 && <Button type="link" danger onClick={() => remove(key)}>删除</Button>}>
                    <Form.Item {...rest} label="标题" name={[key, 'title']} rules={[{ required: true }]}>
                      <Input placeholder="子案标题" />
                    </Form.Item>
                    <Row gutter={12}>
                      <Col span={12}>
                        <Form.Item {...rest} label="案件类型" name={[key, 'case_type']}>
                          <Select options={['清欠', '房产', '物业', '市政', '其他'].map(t => ({ label: t, value: t }))} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item {...rest} label="分派科室" name={[key, 'department_id']}>
                          <Select placeholder="选择科室" options={departments.map(d => ({ label: d.name, value: d.id }))} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Form.Item {...rest} label="办结时限" name={[key, 'deadline']}>
                      <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item {...rest} label="内容" name={[key, 'content']}>
                      <TextArea rows={2} placeholder="子案内容（默认继承父案）" />
                    </Form.Item>
                  </Card>
                ))}
                <Button type="dashed" icon={<PlusOutlined />} onClick={() => add()} block>添加子案</Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

      {/* 合并 Modal */}
      <Modal title="合并案件" open={mergeModal} onCancel={() => setMergeModal(false)} onOk={() => mergeForm.submit()} destroyOnClose>
        <Alert type="info" message="将选中案件合并到当前案件" style={{ marginBottom: 16 }} />
        <Form form={mergeForm} layout="vertical" onFinish={handleMerge}>
          <Form.Item label="选择要合并的案件" name="case_ids" rules={[{ required: true, message: '请选择案件' }]}>
            <Select
              mode="multiple"
              placeholder="选择案件"
              showSearch
              optionFilterProp="label"
              options={allCases.map(c => ({ label: `${c.case_no} - ${c.title}`, value: c.id }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CaseDetail;
