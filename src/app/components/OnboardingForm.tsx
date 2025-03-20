"use client";

import { Input, Form, Select, Button, Row, Col } from "antd";

type OnboardingFormProps = Readonly<{
  handleSubmit: (values: { name: string; role: string }) => void;
  isOnboarding: boolean;
}>;

export default function OnboardingForm({
  handleSubmit,
  isOnboarding,
}: OnboardingFormProps) {
  const [form] = Form.useForm();

  return (
    <div
      style={{
        backgroundColor: "rgba(255,255,255, 0.07)",
        borderRadius: "20px",
        backdropFilter: "blur(2px)",
        padding: "3em 2.5em",
        textAlign: "center",
        color: "black",
        fontSize: "1.2em",
        width: "fit-content",
        border: "1px solid #f0f0f0",
      }}
    >
      <Row
        style={{
          margin: "auto",
          alignItems: "flex-start",
        }}
        gutter={[16, 16]}
      >
        <Col span={16} xs={24} sm={16}>
          <div
            style={{
              color: "black",
              fontSize: "4em",
              fontWeight: 500,
              letterSpacing: "-0.01em",
              textAlign: "left",
              lineHeight: "1em",
            }}
          >
            Let&apos;s get you onboarded
          </div>
        </Col>
        <Col
          span={8}
          xs={24}
          sm={8}
          style={{
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "flex-start",
          }}
        >
          <Form
            form={form}
            style={{ width: "fit-content", textAlign: "left" }}
            layout="vertical"
            variant="outlined"
            onFinish={handleSubmit}
          >
            <Form.Item
              label="Name"
              name="name"
              style={{ fontSize: "1.2em" }}
              rules={[{ required: true, message: "Input required" }]}
            >
              <Input size="large" placeholder="Name" />
            </Form.Item>
            <Form.Item
              label="Role"
              name="role"
              rules={[{ required: true, message: "Input required" }]}
            >
              <Select size="large" placeholder="Select Role">
                <Select.Option value="MANAGER">MANAGER</Select.Option>
                <Select.Option value="CARETAKER">CARETAKER</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item>
              <Button
                style={{
                  paddingInline: "2.4em",
                  paddingTop: "1.5em",
                  paddingBottom: "1.5em",
                  fontSize: "1em",
                }}
                shape="round"
                type="primary"
                htmlType="submit"
                loading={isOnboarding}
              >
                Complete Setup
              </Button>
            </Form.Item>
          </Form>
        </Col>
      </Row>
    </div>
  );
}
