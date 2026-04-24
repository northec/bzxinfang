import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Select, DatePicker, message, Breadcrumb } from 'antd';
import { useNavigate } from 'react-router-dom';
import { HomeOutlined } from '@ant-design/icons';

const caseTypes = ['清欠', '房产', '物业', '市政', '其他'];
const sources = ['12345', '小程序', '国务院督查', '信访局', '其他'];

const CaseNew: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetch('/api/departments', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(data => setDepartments(data || [])).catch(() => {});
  }, []);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const body = {
        ...values,
        deadline: values.deadline?.format('YYYY-MM-DD'),
      };
      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        message.success('案件创建成功');
        navigate(`/cases/${data.id}`);
      } else {
        message.error(data.error || '创建失败');
      }
    } catch { message.error('创建失败'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <Breadcrumb items={[
        { title: <><HomeOutlined /> 工作台</>, onClick: () => navigate('/') },
        { title: <span style={{ cursor: 'pointer' }} onClick={() => navigate('/cases')}>案件管理</span> },
        { title: '新建案件' },
      ]} style={{ marginBottom: 16 }} />
      <Card title="新建案件" size="small">
        <Form form={form} layout="vertical" onFinish={onFinish} style={{ maxWidth: 700 }}>
          <Form.Item label="案件标题" name="title" rules={[{ required: true, message: '请输入案件标题' }]}>
            <Input placeholder="请输入案件标题" />
          </Form.Item>
          <Form.Item label="信访人姓名" name="petitioner_name" rules={[{ required: true }]}>
            <Input placeholder="信访人姓名" />
          </Form.Item>
          <Form.Item label="信访人电话" name="petitioner_phone" rules={[{ required: true }]}>
            <Input placeholder="联系电话" />
          </Form.Item>
          <Form.Item label="信访人身份证号" name="petitioner_id_card">
            <Input placeholder="身份证号码（选填）" />
          </Form.Item>
          <Form.Item label="案件类型" name="case_type" rules={[{ required: true, message: '请选择案件类型' }]}>
            <Select placeholder="请选择" options={caseTypes.map(t => ({ value: t, label: t }))} />
          </Form.Item>
          <Form.Item label="来源渠道" name="source" rules={[{ required: true }]}>
            <Select placeholder="请选择" options={sources.map(s => ({ value: s, label: s }))} />
          </Form.Item>
          <Form.Item label="诉求内容" name="content" rules={[{ required: true, message: '请输入诉求内容' }]}>
            <Input.TextArea rows={4} placeholder="请详细描述信访诉求" />
          </Form.Item>
          <Form.Item label="办结时限" name="deadline">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="主办单位" name="dispatch_department_id">
            <Select placeholder="请选择主办单位" allowClear
              options={departments.filter((d: any) => d.type === '办案科室').map((d: any) => ({ value: d.id, label: d.name }))} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>提交创建</Button>
            <Button style={{ marginLeft: 8 }} onClick={() => navigate('/cases')}>取消</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default CaseNew;
