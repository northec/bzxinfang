import React, { Suspense } from 'react';
import { Layout, Spin, Dropdown, Avatar, Button, Menu, theme } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  FileTextOutlined,
  SendOutlined,
  InboxOutlined,
  BarChartOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useAuth } from './contexts/authcontext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import AppRoutes from './routes/approutes';

const { Header, Sider, Content, Footer } = Layout;

const App: React.FC = () => {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { token: themeToken } = theme.useToken();

  if (!user) {
    return (
      <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin size="large" /></div>}>
        <AppRoutes />
      </Suspense>
    );
  }

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: <Link to="/">工作台</Link> },
    ...(user.role !== 'handler' ? [
      { key: '/cases', icon: <FileTextOutlined />, label: <Link to="/cases">案件管理</Link> },
      { key: '/pending', icon: <InboxOutlined />, label: <Link to="/pending">待受理队列</Link> },
      { key: '/dispatch', icon: <SendOutlined />, label: <Link to="/dispatch">任务分派</Link> },
      { key: '/stats', icon: <BarChartOutlined />, label: <Link to="/stats">统计看板</Link> },
    ] : []),
    ...(user.role === 'handler' ? [
      { key: '/my-tasks', icon: <InboxOutlined />, label: <Link to="/my-tasks">我的任务</Link> },
    ] : []),
    ...(user.role === 'admin' ? [
      { type: 'divider' as const },
      { key: '/config/departments', icon: <TeamOutlined />, label: <Link to="/config/departments">部门管理</Link> },
      { key: '/config/users', icon: <UserOutlined />, label: <Link to="/config/users">用户管理</Link> },
    ] : []),
  ];

  const roleLabels: Record<string, string> = {
    admin: '管理员',
    supervisor: '主管部门',
    handler: '办案科室',
  };

  const userMenuItems = [
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true },
  ];

  return (
    <Layout className="app-layout">
      <Sider
        className="app-sider"
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={220}
        style={{ background: '#001529' }}
      >
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <span style={{ color: '#fff', fontSize: collapsed ? 14 : 16, fontWeight: 600, whiteSpace: 'nowrap' }}>
            {collapsed ? '住建信访' : '滨州市住建信访平台'}
          </span>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout>
        <Header className="app-header">
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 16, width: 64, height: 64 }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ color: '#8c8c8c' }}>{roleLabels[user.role] || user.role}</span>
            <Dropdown menu={{ items: userMenuItems, onClick: ({ key }) => { if (key === 'logout') logout(); } }}>
              <Button type="text" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar size="small" style={{ background: themeToken.colorPrimary }}>{user.name?.[0]}</Avatar>
                {user.name}
              </Button>
            </Dropdown>
          </div>
        </Header>
        <Content className="app-content" style={{ background: '#f0f2f5' }}>
          <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}><Spin size="large" /></div>}>
            <AppRoutes />
          </Suspense>
        </Content>
        <Footer className="app-footer" style={{ color: '#8c8c8c' }}>
          滨州市住建领域信访管理平台 ©2024
        </Footer>
      </Layout>
    </Layout>
  );
};

export default App;
