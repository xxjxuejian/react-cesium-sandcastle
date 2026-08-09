import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { Alert, Button, ConfigProvider, Form, Input, theme } from "antd";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { LanguageSwitch } from "@/components/LanguageSwitch";
import { useAuthStore } from "@/store/auth";
import type { LoginRequest } from "@/auth/types";
import "./login.scss";

const { darkAlgorithm } = theme;

function LoginContent() {
  const { t } = useTranslation();
  const login = useAuthStore((state) => state.login);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const onFinish = async (values: LoginRequest) => {
    setSubmitting(true);
    setErrorMessage("");

    try {
      await login(values);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : t("login.loginFailed"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-shell">
      <div className="login-language">
        <LanguageSwitch />
      </div>

      <section className="login-intro">
        <div className="login-eyebrow">CESIUM / SPATIAL RUNTIME</div>
        <h1>{t("login.heroTitle")}</h1>
        <p>{t("login.heroDescription")}</p>

        <div className="orbital-map" aria-hidden="true">
          <div className="orbital-globe" />
          <div className="orbit orbit-one"><span /></div>
          <div className="orbit orbit-two"><span /></div>
          <div className="coordinate coordinate-north">39.9042° N</div>
          <div className="coordinate coordinate-east">116.4074° E</div>
        </div>

        <div className="login-system-line">
          <span>{t("login.systemStatus")}</span>
          <span>{t("login.routePolicy")}</span>
          <span>{t("login.renderEngine")}</span>
        </div>
      </section>

      <section className="login-panel-wrap">
        <div className="login-panel">
          <div className="login-panel-mark" aria-hidden="true">
            CS
          </div>
          <p className="login-panel-kicker">ACCESS PORTAL</p>
          <h2>{t("login.title")}</h2>
          <p className="login-panel-description">{t("login.description")}</p>

          <Form<LoginRequest>
            layout="vertical"
            requiredMark={false}
            initialValues={{ username: "admin", password: "admin123" }}
            onFinish={onFinish}
          >
            <Form.Item
              label={t("login.username")}
              name="username"
              rules={[{ required: true, message: t("login.usernameRequired") }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder={t("login.usernamePlaceholder")}
                autoComplete="username"
                size="large"
              />
            </Form.Item>

            <Form.Item
              label={t("login.password")}
              name="password"
              rules={[{ required: true, message: t("login.passwordRequired") }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder={t("login.passwordPlaceholder")}
                autoComplete="current-password"
                size="large"
              />
            </Form.Item>

            {errorMessage ? (
              <Alert
                className="login-error"
                type="error"
                title={errorMessage}
                showIcon
              />
            ) : null}

            <Button
              className="login-submit"
              type="primary"
              htmlType="submit"
              size="large"
              loading={submitting}
              block
            >
              {t("login.submit")}
            </Button>
          </Form>

          <div className="login-demo-accounts">
            <span>{t("login.demoTitle")}</span>
            <code>admin / admin123</code>
            <code>viewer / viewer123</code>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <ConfigProvider
      theme={{
        algorithm: darkAlgorithm,
        token: {
          colorPrimary: "#22d3ee",
          colorBgContainer: "#0b2239",
          borderRadius: 8,
        },
      }}
    >
      <LoginContent />
    </ConfigProvider>
  );
}
