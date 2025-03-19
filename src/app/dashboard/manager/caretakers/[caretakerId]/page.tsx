"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Table, Button, Modal } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useQuery } from "@apollo/client";
import { Shift } from "@prisma/client";
import moment from "moment";
import { GET_CARETAKER_SHIFTS } from "@utils/queries";

type CareTaker = {
  id: string;
  name: string;
  email: string;
};

export default function CareTakerPage() {
  const router = useRouter();
  const pathname = usePathname();
  const caretakerId = pathname.split("/").pop();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [caretaker, setCaretaker] = useState<CareTaker>({
    name: "",
    id: "",
    email: "",
  });
  const { data, loading, error } = useQuery(GET_CARETAKER_SHIFTS, {
    variables: { userId: caretakerId }, // Get the caretaker shifts from the database
  });
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    if (!loading && data) {
      console.log(data.caretakerShifts, data.caretakerShifts.shifts);
      setCaretaker(data.caretakerShifts);
      setShifts(data.caretakerShifts.shifts);
    }
    if (error) {
      console.error(error);
    }
  }, [data, loading, error]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const handleRowClick = (shift: Shift) => { // Open the modal to view the shift details
    setSelectedShift(shift);
    setIsModalVisible(true);
  };

  const handleModalClose = () => { // Close the modal
    setIsModalVisible(false);
    setSelectedShift(null);
  };

  const formatText = (text: string) => { // Format the text to be displayed in the table
    if (!text) return "-";
    return text.length > 20 ? `${text.substring(0, 20)}...` : text;
  };

  const columns = [ // Columns for the table
    {
      title: "Date",
      dataIndex: "clockIn",
      key: "clockIn",
      render: (text: string) => moment(text).format("YYYY-MM-DD"),
    },
    {
      title: "Clock In Time",
      dataIndex: "clockIn",
      key: "clockInTime",
      render: (text: string) => moment(text).format("HH:mm"),
    },
    {
      title: "Clock In Note",
      dataIndex: "clockInNote",
      key: "clockInNote",
      render: (text: string) => formatText(text),
    },
    {
      title: "Clock Out Time",
      dataIndex: "clockOut",
      key: "clockOutTime",
      render: (text: string) => (text ? moment(text).format("HH:mm") : "-"),
    },
    {
      title: "Clock Out Note",
      dataIndex: "clockOutNote",
      key: "clockOutNote",
      render: (text: string) => formatText(text),
    },
    {
      title: "Action",
      key: "action",
      render: (_: unknown, record: Shift) => (
        <Button onClick={() => handleRowClick(record)}>+</Button>
      ),
    },
  ];

  return (
    <>
      <div
        style={{
          marginBottom: 24,
          paddingBottom: 48,
          borderBottom: "1px solid #f0f0f0",
        }}
      >
        <Button
          type="text"
          size="large"
          icon={<ArrowLeftOutlined />}
          style={{
            paddingLeft: 0,
            marginBottom: 16,
            justifyContent: "flex-start",
          }}
          onClick={() => router.back()}
        />
        <h1>{caretaker.name}</h1>
        <div style={{ paddingTop: 8 }}>{caretaker.email}</div>
      </div>
      <div>
        <h2>Shifts</h2>
      </div>

      <Table // Table for the shifts
        columns={columns}
        dataSource={shifts}
        rowKey="id"
        style={{
          paddingTop: 36,
        }}
      />
      <Modal // Modal for the shift details
        title="Shift Details"
        open={isModalVisible}
        onCancel={handleModalClose}
        footer={null}
      >
        {selectedShift && (
          <div>
            <p>
              <strong>Date:</strong>{" "}
              {moment(selectedShift.clockIn).format("YYYY-MM-DD")}
            </p>
            <p>
              <strong>Clock In Time:</strong>{" "}
              {moment(selectedShift.clockIn).format("HH:mm")}
            </p>
            <p>
              <strong>Clock In Note:</strong> {selectedShift.clockInNote ?? "-"}
            </p>
            <p>
              <strong>Clock Out Time:</strong>{" "}
              {selectedShift.clockOut
                ? moment(selectedShift.clockOut).format("HH:mm")
                : "-"}
            </p>
            <p>
              <strong>Clock Out Note:</strong>{" "}
              {selectedShift.clockOutNote ?? "-"}
            </p>
          </div>
        )}
      </Modal>
    </>
  );
}
