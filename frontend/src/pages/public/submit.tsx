import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Select, Upload, message, Breadcrumb, Steps } from 'antd';
import { HomeOutlined, UploadOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/authcontext';

const { TextArea } = Input;
const { Dragger } = Upload;

const caseTypes = [
  { value: '清欠', label: '拖欠工资/工程款' },
  { value: '房产', label: '房产交易/开发商问题' },
  { value: '物业', label: '物业服务/收费问题' },
  { value: '市政', label: '市政设施/道路问题' },
  { value: '质量', label: '房屋质量投诉' },
  { value: '其他', label: '其他问题' },
];

const PublicSubmit: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [caseNo, setCaseNo] = useState('');
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!user) navigate('/public/login');
  }, [user]);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...values,
          source: '群众端',
          status: '待受理',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCaseNo(data.case_no);
        setSubmitted(true);
        message.success('诉求提交成功');
      } else {
        message.error(data.error || '提交失败');
      }
    } catch { message.error('提交失败'); }
    finally { setLoading(false); }
  };

  if (submitted) {
    return (
      <div style={{ maxWidth: 600, margin: '60px auto', textAlign: 'center' }}>
        <Card>
          <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a', marginBottom: 24 }} />
          <h2 style={{ fontSize: 24 }}>提交成功</h2>
          <p style={{ color: '#595959', marginBottom: 8 }}>您的信访诉求已提交成功！</p>
          <p style={{ fontSize: 18, marginBottom: 24 }}>
            案件编号：<strong style={{ color: '#1677ff' }}>{caseNo}</strong>
          </p>
          <p style={{ color: '#8c8c8c', marginBottom: 24 }}>
            请保持手机畅通，主管部门将在3个工作日内审核并回复。<br />
            您可凭手机号在"查询进度"页面查看案件状态。
          </p>
          <Button type="primary" onClick={() => navigate('/public/home')}>返回首页</Button>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <Breadcrumb items={[
        { title: <Link to="/public/home"><HomeOutlined /> 首页</Link> },
        { title: '提交信访诉求' },
      ]} style={{ marginBottom: 24 }} />

      <Card title="提交信访诉求" size="small" extra={<small style={{ color: '#8c8c8c' }}>请填写真实信息</small>}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item label="信访人姓名" name="petitioner_name" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="请输入真实姓名" />
          </Form.Item>
          <Form.Item label="手机号码" name="petitioner_phone" rules={[
            { required: true, message: '请输入手机号' },
            { pattern: /^1\d{10}$/, message: '手机号格式不正确' },
          ]}>
            <Input placeholder="用于查询进度和接收通知" maxLength={11} />
          </Form.Item>
          <Form.Item label="身份证号" name="petitioner_id_card">
            <Input placeholder="选填，便于核实身份" maxLength={18} />
          </Form.Item>
          <Form.Item label="诉求类型" name="case_type" rules={[{ required: true, message: '请选择诉求类型' }]}>
            <Select placeholder="请选择诉求类型" options={caseTypes} />
          </Form.Item>
          <Form.Item label="诉求标题" name="title" rules={[{ required: true, message: '请输入诉求标题' }]}>
            <Input placeholder="一句话描述您的诉求" />
          </Form.Item>
          <Form.Item label="详细诉求内容" name="content" rules={[{ required: true, message: '请输入诉求内容' }]}>
            <TextArea rows={5} placeholder="请详细描述您的诉求，包括时间、地点、涉及单位等信息" />
          </Form.Item>
          <Form.Item label="上传附件（选填）" name="attachments">
            <Dragger
              customRequest={({ file, onSuccess, onError }) => {
                const formData = new FormData();
                formData.append('file', file);
                fetch(`/api/public/upload`, {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${token}` },
                  body: formData,
                })
                  .then(r => r.json())
                  .then(data => { if (data.url) onSuccess(data); else onError(new Error(data.error)); })
                  .catch(onError);
              }}
              multiple
              beforeUpload={() => false}
            >
              <p><UploadOutlined style={{ fontSize: 32, color: '#1677ff' }} /></p>
              <p style={{ color: '#8c8c8c' }}>上传相关材料，如合同、照片、文件等（选填）</p>
            </Dragger>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} size="large" style={{ width: '100%' }}>
              提交诉求
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card size="small" style={{ marginTop: 16, background: '#f6f8fa' }}>
        <h4 style={{ marginBottom: 8 }}>📌 注意事项</h4>
        <ul style={{ margin: 0, paddingLeft: 20, color: '#595959', lineHeight: 1.8 }}>
          <li>请填写真实有效的个人信息，便于主管部门核实</li>
          <li>诉求内容应真实、具体，避免空洞模糊</li>
          <li>上传的附件将有助于案件处理</li>
          <li>提交后系统将生成案件编号，请妥善保存</li>
          <li>主管部门将在3个工作日内决定是否受理</li>
        </ul>
      </Card>
    </div>
  );
};

export default PublicSubmit;