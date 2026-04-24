import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Tag, Space, message, Popconfirm, Tree } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, TeamOutlined } from '@ant-design/icons';

const Departments: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/departments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setData(json || []);
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
      form.setFieldsValue(record);
    }
    setModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      const url = editing
        ? `/api/departments/${editing.id}`
        : '/api/departments';
      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          leader_id: values.leader_id || null,
          parent_id: values.parent_id || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      message.success(editing ? '更新成功' : '创建成功');
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      message.error(err.message || '操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/departments/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      message.success('删除成功');
      fetchData();
    } catch (err: any) {
      message.error(err.message || '删除失败');
    }
  };

  // Build tree data
  const buildTree = (list: any[]) => {
    const map: Record<number, any> = {};
    const roots: any[] = [];
    list.forEach(item => { map[item.id] = { ...item, key: item.id, children: [] }; });
    list.forEach(item => {
      if (item.parent_id && map[item.parent_id]) {
        map[item.parent_id].children.push(map[item.id]);
      } else {
        roots.push(map[item.id]);
      }
    });
    return roots;
  };

  const treeData = buildTree(data);

  const columns = [
    { title: '部门名称', dataIndex: 'name', key: 'name' },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (v: string) => <Tag color={v === '主管部门' ? 'red' : 'blue'}>{v}</Tag>,
    },
    {
      title: '负责人',
      dataIndex: ['leader', 'name'],
      key: 'leader',
      width: 100,
      render: (v: string) => v || '-',
    },
    {
      title: '人员数',
      dataIndex: ['_count', 'users'],
      key: 'userCount',
      width: 80,
    },
    {
      title: '案件数',
      dataIndex: ['_count', 'cases'],
      key: 'caseCount',
      width: 80,
    },
    {
      title: '上级部门',
      dataIndex: ['parent', 'name'],
      key: 'parent',
      width: 120,
      render: (v: string) => v || '-',
    },
    {
      title: '操作',
      width: 150,
      render: (_: any, r: any) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openModal(r)}>编辑</Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(r.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title={<Space><TeamOutlined /> 部门管理</Space>}
        size="small"
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>新增部门</Button>}
      >
        <Table
          dataSource={data}
          rowKey="id"
          columns={columns}
          loading={loading}
          pagination={false}
          expandable={{
            defaultExpandAllRows: true,
          }}
          rowSelection={undefined}
        />
      </Card>

      <Modal
        title={editing ? '编辑部门' : '新增部门'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item label="部门名称" name="name" rules={[{ required: true, message: '请输入部门名称' }]}>
            <Input placeholder="请输入部门名称" />
          </Form.Item>
          <Form.Item label="部门类型" name="type" rules={[{ required: true, message: '请选择类型' }]}>
            <Select
              options={[
                { label: '主管部门', value: '主管部门' },
                { label: '办案科室', value: '办案科室' },
              ]}
            />
          </Form.Item>
          <Form.Item label="上级部门" name="parent_id">
            <Select
              allowClear
              placeholder="无（顶级部门）"
              options={data.filter(d => d.id !== editing?.id).map(d => ({ label: d.name, value: d.id }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Departments;
