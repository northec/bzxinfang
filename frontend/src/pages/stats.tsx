import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Spin } from 'antd';
import ReactECharts from 'echarts-for-react';
import { useAuth } from '../contexts/authcontext';

const Stats: React.FC = () => {
  const [stats, setStats] = useState<any>({});
  const [typeData, setTypeData] = useState<any[]>([]);
  const [sourceData, setSourceData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [deptData, setDeptData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stats/full', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setStats(data);
      setTypeData(data.typeDistribution || []);
      setSourceData(data.sourceDistribution || []);
      setMonthlyData(data.monthlyTrend || []);
      setDeptData(data.departmentStats || []);
    } catch {}
    finally { setLoading(false); }
  };

  const typeChartOption = {
    title: { text: '案件类型分布', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    series: [{
      type: 'pie', radius: ['40%', '70%'], center: ['50%', '55%'],
      data: typeData.map((d: any) => ({ name: d.type, value: d.count })),
      label: { formatter: '{b}\n{d}%' },
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' } },
    }],
    color: ['#1677ff', '#fa8c16', '#13c2c2', '#52c41a', '#722ed1'],
  };

  const sourceChartOption = {
    title: { text: '来源渠道统计', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: sourceData.map((d: any) => d.source), axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value', minInterval: 1 },
    series: [{
      type: 'bar', data: sourceData.map((d: any) => d.count),
      itemStyle: { color: '#1677ff', borderRadius: [4, 4, 0, 0] },
      barWidth: '40%',
    }],
    grid: { left: 40, right: 20, bottom: 30, top: 40 },
  };

  const monthlyChartOption = {
    title: { text: '月度趋势', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: monthlyData.map((d: any) => d.month), axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      { name: '新建', type: 'line', data: monthlyData.map((d: any) => d.created), smooth: true, lineStyle: { color: '#1677ff' }, itemStyle: { color: '#1677ff' } },
      { name: '完成', type: 'line', data: monthlyData.map((d: any) => d.completed), smooth: true, lineStyle: { color: '#52c41a' }, itemStyle: { color: '#52c41a' } },
    ],
    grid: { left: 40, right: 20, bottom: 30, top: 40 },
    legend: { data: ['新建', '完成'], bottom: 0 },
  };

  const deptChartOption = {
    title: { text: '部门办案量', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: deptData.map((d: any) => d.department), axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      { name: '办理中', type: 'bar', stack: 'total', data: deptData.map((d: any) => d.processing), itemStyle: { color: '#fa8c16' } },
      { name: '已完成', type: 'bar', stack: 'total', data: deptData.map((d: any) => d.completed), itemStyle: { color: '#52c41a' } },
    ],
    grid: { left: 40, right: 20, bottom: 30, top: 40 },
    legend: { data: ['办理中', '已完成'], bottom: 0 },
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>;

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}><Card><Statistic title="案件总数" value={stats.total || 0} valueStyle={{ color: '#1677ff' }} /></Card></Col>
        <Col xs={12} sm={6}><Card><Statistic title="办理中" value={stats.processing || 0} valueStyle={{ color: '#fa8c16' }} /></Card></Col>
        <Col xs={12} sm={6}><Card><Statistic title="已完成" value={stats.completed || 0} valueStyle={{ color: '#52c41a' }} /></Card></Col>
        <Col xs={12} sm={6}><Card><Statistic title="超期率" value={stats.overdueRate || '0%'} valueStyle={{ color: '#ff4d4f' }} /></Card></Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}><Card><ReactECharts option={typeChartOption} style={{ height: 320 }} /></Card></Col>
        <Col xs={24} lg={12}><Card><ReactECharts option={sourceChartOption} style={{ height: 320 }} /></Card></Col>
        <Col xs={24} lg={12}><Card><ReactECharts option={monthlyChartOption} style={{ height: 320 }} /></Card></Col>
        <Col xs={24} lg={12}><Card><ReactECharts option={deptChartOption} style={{ height: 320 }} /></Card></Col>
      </Row>
    </div>
  );
};

export default Stats;
