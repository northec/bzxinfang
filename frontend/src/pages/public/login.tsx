import React, { useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { PhoneOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/authcontext';

const PublicLogin: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const { login } = useAuth();
  const navigate = useNavigate();

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      await publicLogin(values.phone, values.code);
      message.success('登录成功');
      navigate('/public/home');
    } catch (err: any) {
      message.error(err.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const sendCode = async () => {
    const phone = document.querySelector('input[name="phone"]') as HTMLInputElement;
    if (!phone?.value || phone.value.length !== 11) {
      message.error('请输入正确的手机号');
      return;
    }
    setSendingCode(true);
    try {
      const res = await fetch('/api/public/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      message.success('验证码已发送');
      setCodeSent(true);
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) { clearInterval(timer); return 0; }
          return c - 1;
        });
      }, 1000);
    } catch (err: any) {
      message.error(err.message || '发送失败');
    } finally {
      setSendingCode(false);
    }
  };

  return (
    <div className="login-container">
      <Card className="login-card" bordered={false}>
        <div className="login-logo">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect width="48" height="48" rx="12" fill="#1677ff" />
            <path d="M24 12L12 20v16h8V28h8v8h8V20L24 12z" fill="white" />
          </svg>
          <h2>滨州市住建信访平台</h2>
          <p style={{ color: '#8c8c8c', marginTop: 8 }}>群众端</p>
        </div>
        <Form onFinish={onFinish} size="large">
          <Form.Item name="phone" rules={[{ required: true, message: '请输入手机号' }, { pattern: /^1\d{10}$/, message: '手机号格式不正确' }]}>
            <Input prefix={<PhoneOutlined />} placeholder="手机号" maxLength={11} />
          </Form.Item>
          <Form.Item name="code" rules={[{ required: true, message: '请输入验证码' }]}>
            <Input
              prefix={<LockOutlined />}
              placeholder="验证码"
              maxLength={6}
              suffix={
                <Button type="link" size="small" onClick={sendCode} loading={sendingCode} disabled={countdown > 0}>
                  {countdown > 0 ? `${countdown}s` : '获取验证码'}
                </Button>
              }
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              登 录
            </Button>
          </Form.Item>
        </Form>
        <div style={{ textAlign: 'center', color: '#8c8c8c', fontSize: 12, marginTop: 8 }}>
          首次登录将自动注册
        </div>
      </Card>
    </div>
  );
};

export default PublicLogin;