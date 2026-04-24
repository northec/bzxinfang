import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Tag, Space, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/authcontext';

const Users: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();
  const token = localStorage.getItem('token');

  const roleLabels: Record<string, string> = {
    admin: '管理员',
    supervisor: '主管部门',
    handler: '办案科室',
  };

  const roleColors: Record<string, string> = {
    admin: 'red',
    supervisor: 'orange',
    handler: 'blue',
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [usersRes, deptRes] = await Promise.all([
        fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/departments', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [usersData, deptData] = await Promise.all([usersRes.json(), deptRes.json()]);
      setData(usersData || []);
      setDepartments(deptData || []);
    } catch {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (record?: any) => {
    setEditing(record || null);
    form.resetFields();
    if (record) {
      form.setFieldsValue({
        ...record,
        department_id: record.department_id,
        password: undefined,
      });
    } else {
      form.setFieldsValue({ role: 'handler' });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      const url = editing
        ? `/api/users/${editing.id}`
        : '/api/users';
      const payload = { ...values };
      if (!payload.password) delete payload.password;

      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      message.success(editing ? '更新成功' : '创建成功');
      setModalOpen(false);
      fetchAll();
    } catch (err: any) {
      message.error(err.message || '操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    if (id === user?.id) {
      message.warning('不能删除当前登录用户');
      return;
    }
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      message.success('删除成功');
      fetchAll();
    } catch (err: any) {
      message.error(err.message || '删除失败');
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 60,
    },
    {
      title: '用户名',
      dataIndex: 'username',
      width: 120,
    },
    {
      title: '姓名',
      dataIndex: 'name',
      width: 100,
    },
    {
      title: '部门',
      dataIndex: ['department', 'name'],
      width: 120,
      render: (v: string) => v ? <Tag>{v}</Tag> : '-',
    },
    {
      title: '角色',
      dataIndex: 'role',
      width: 100,
      render: (v: string) => <Tag color={roleColors[v]}>{roleLabels[v] || v}</Tag>,
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      width: 130,
      render: (v: string) => v || '-',
    },
    {
      title: '操作',
      width: 150,
      render: (_: any, r: any) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openModal(r)}>编辑</Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(r.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} disabled={r.id === user?.id}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title={<Space><UserOutlined /> 用户管理</Space>}
        size="small"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
            新增用户
          </Button>
        }
      >
        <Table
          dataSource={data}
          rowKey="id"
          columns={columns}
          loading={loading}
          pagination={false}
        />
      </Card>

      <Modal
        title={editing ? '编辑用户' : '新增用户'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        destroyOnClose
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item label="用户名" name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input placeholder="请输入用户名" disabled={!!editing} />
          </Form.Item>
          <Form.Item label="姓名" name="name" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="请输入姓名" />
          </Form.Item>
          <Form.Item
            label="密码"
            name="password"
            rules={editing ? [] : [{ required: true, message: '请输入密码' }]}
            extra={editing ? '留空则不修改密码' : '默认密码: 123456'}
          >
            <Input.Password placeholder={editing ? '留空不修改' : '请输入密码'} />
          </Form.Item>
          <Form.Item label="角色" name="role" rules={[{ required: true, message: '请选择角色' }]}>
            <Select
              options={[
                { label: '管理员', value: 'admin' },
                { label: '主管部门', value: 'supervisor' },
                { label: '办案科室', value: 'handler' },
              ]}
            />
          </Form.Item>
          <Form.Item label="所属部门" name="department_id">
            <Select
              allowClear
              placeholder="选择部门"
              showSearch
              optionFilterProp="label"
              options={departments.map(d => ({ label: d.name, value: d.id }))}
            />
          </Form.Item>
          <Form.Item label="手机号" name="phone">
            <Input placeholder="请输入手机号" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Users;
