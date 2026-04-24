import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Tag, Input, Select, DatePicker, Space, message, Modal, Upload, Progress } from 'antd';
import { PlusOutlined, SearchOutlined, UploadOutlined, SplitCellsOutlined, MergeCellsOutlined, ExclamationCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import * as XLSX from 'exceljs';

const { RangePicker } = DatePicker;

const caseTypes = ['清欠', '房产', '物业', '市政', '其他'];
const sources = ['12345', '小程序', '国务院督查', '信访局', '其他'];
const statuses = ['新建', '已分派', '已签收', '办理中', '待审核', '已完成', '已撤案', '已合并'];

interface CaseItem {
  id: number;
  case_no: string;
  title: string;
  petitioner_name: string;
  petitioner_phone: string;
  case_type: string;
  source: string;
  status: string;
  deadline?: string;
  created_at: string;
}

const statusColor: Record<string, string> = {
  '新建': 'default', '已分派': 'processing', '已签收': 'purple',
  '办理中': 'warning', '待审核': 'cyan', '已完成': 'success',
  '已撤案': 'default', '已合并': 'blue',
};

const CaseList: React.FC = () => {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedRows, setSelectedRows] = useState<CaseItem[]>([]);
  const [filters, setFilters] = useState<any>({});
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const fetchCases = async (p = page, ps = pageSize, f = filters) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), pageSize: String(ps) });
      if (f.status) params.set('status', f.status);
      if (f.case_type) params.set('case_type', f.case_type);
      if (f.source) params.set('source', f.source);
      if (f.keyword) params.set('keyword', f.keyword);
      if (f.dateRange) {
        params.set('startDate', f.dateRange[0]);
        params.set('endDate', f.dateRange[1]);
      }
      const res = await fetch(`/api/cases?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setCases(data.cases || []);
      setTotal(data.total || 0);
    } catch { message.error('获取案件列表失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCases(); }, []);

  const handleSearch = () => { setPage(1); fetchCases(1, pageSize, filters); };
  const handleTableChange = (p: any, ps: any) => { setPage(p.current); setPageSize(p.pageSize); fetchCases(p.current, p.pageSize, filters); };

  const handleExport = () => { message.info('导出功能开发中'); };

  const handleBatchDismiss = async () => {
    if (selectedRows.length === 0) return message.warning('请先选择案件');
    Modal.confirm({
      title: '批量撤案',
      icon: <ExclamationCircleOutlined />,
      content: `确定要撤案 ${selectedRows.length} 个案件吗？`,
      onOk: async () => {
        try {
          await Promise.all(selectedRows.map(c =>
            fetch(`/api/cases/${c.id}/status`, {
              method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ status: '已撤案' })
            })
          ));
          message.success('批量撤案成功');
          fetchCases();
          setSelectedRows([]);
        } catch { message.error('操作失败'); }
      }
    });
  };

  const handleMerge = () => {
    if (selectedRows.length < 2) return message.warning('请选择至少2个案件进行合并');
    navigate(`/cases/merge?ids=${selectedRows.map(r => r.id).join(',')}`);
  };

  const handleSplit = (record: CaseItem) => {
    navigate(`/cases/${record.id}/split`);
  };

  const handleReminder = async (id: number) => {
    try {
      await fetch(`/api/cases/${id}/remind`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      message.success('催办通知已发送');
    } catch { message.error('催办失败'); }
  };

  const columns: ColumnsType<CaseItem> = [
    { title: '案件编号', dataIndex: 'case_no', width: 170, render: (v, r) => <Link to={`/cases/${r.id}`} style={{ fontWeight: 500 }}>{v}</Link> },
    { title: '标题', dataIndex: 'title', ellipsis: true },
    { title: '信访人', dataIndex: 'petitioner_name', width: 80 },
    { title: '电话', dataIndex: 'petitioner_phone', width: 120 },
    { title: '类型', dataIndex: 'case_type', width: 70, render: v => <Tag>{v}</Tag> },
    { title: '来源', dataIndex: 'source', width: 100 },
    { title: '状态', dataIndex: 'status', width: 80, render: s => <Tag color={statusColor[s]}>{s}</Tag> },
    { title: '办结时限', dataIndex: 'deadline', width: 110, render: v => {
      if (!v) return '-';
      const overdue = new Date(v) < new Date();
      return <span style={{ color: overdue ? '#ff4d4f' : undefined }}>{overdue && '⚠️ '}{v?.split('T')[0]}</span>;
    }},
    { title: '创建时间', dataIndex: 'created_at', width: 110, render: v => v?.split('T')[0] },
    {
      title: '操作', width: 180, fixed: 'right',
      render: (_, r) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => navigate(`/cases/${r.id}`)}>详情</Button>
          {r.status === '新建' && <Button type="link" size="small" onClick={() => handleSplit(r)} icon={<SplitCellsOutlined />}>拆分</Button>}
          {r.status === '已分派' && <Button type="link" size="small" onClick={() => handleReminder(r.id)} style={{ color: '#ff4d4f' }}>催办</Button>}
        </Space>
      )
    },
  ];

  return (
    <div>
      <Card title="案件管理" size="small">
        <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <Input placeholder="搜索案件编号/标题/信访人" prefix={<SearchOutlined />} style={{ width: 240 }}
            onChange={e => setFilters(f => ({ ...f, keyword: e.target.value }))} onPressEnter={handleSearch} allowClear />
          <Select placeholder="状态" style={{ width: 110 }} allowClear
            options={statuses.map(s => ({ value: s, label: s }))}
            onChange={v => setFilters(f => ({ ...f, status: v }))} />
          <Select placeholder="案件类型" style={{ width: 110 }} allowClear
            options={caseTypes.map(t => ({ value: t, label: t }))}
            onChange={v => setFilters(f => ({ ...f, case_type: v }))} />
          <Select placeholder="来源" style={{ width: 110 }} allowClear
            options={sources.map(s => ({ value: s, label: s }))}
            onChange={v => setFilters(f => ({ ...f, source: v }))} />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>查询</Button>
          <div style={{ flex: 1 }} />
          <Button icon={<DeleteOutlined />} onClick={handleBatchDismiss} disabled={!selectedRows.length}>批量撤案</Button>
          <Button icon={<MergeCellsOutlined />} onClick={handleMerge} disabled={selectedRows.length < 2}>合并</Button>
          <Button icon={<UploadOutlined />} onClick={handleExport}>导出</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/cases/new')}>新建案件</Button>
        </div>
        <Table
          dataSource={cases} rowKey="id" loading={loading}
          columns={columns} scroll={{ x: 1300 }}
          rowSelection={{ selectedRowKeys: selectedRows.map(r => r.id), onChange: (keys: any) => setSelectedRows(selectedRows.filter(r => keys.includes(r.id))) }}
          pagination={{ current: page, pageSize, total, showSizeChanger: true, showTotal: t => `共 ${t} 条` }}
          onChange={handleTableChange}
          size="small"
        />
      </Card>
    </div>
  );
};

export default CaseList;
