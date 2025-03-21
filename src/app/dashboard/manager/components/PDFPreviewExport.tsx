import { Table, Button, Flex } from "antd";
import moment from "moment";
import { TableShift } from "./ActiveCompletedCareTakers";

type PDFPreviewExportProps = Readonly<{
  data: TableShift[];
  confirmExport: (format: string) => void;
}>;

export default function PDFPreviewExport({
  data,
  confirmExport,
}: PDFPreviewExportProps) {
  const maxRows = 10; // Maximum number of rows to display
  const displayData = data.length > maxRows ? data.slice(0, maxRows) : data;

  // Add a placeholder row if there are more than 10 rows
  if (data.length > maxRows) {
    displayData.push({
      id: "placeholder",
      userId: "",
      clockIn: new Date(),
      clockOut: null,
      clockInNote: "",
      clockOutNote: "",
      userName: "...", // Placeholder for the dummy row
      uniqueId: "",
    });
  }

  const columns = [
    // Columns for the PDF preview
    { title: "Name", dataIndex: "userName", key: "name" },
    {
      title: "Clock In",
      dataIndex: "clockIn",
      key: "clockIn",
      render: (text: string) => moment(text).format("YYYY-MM-DD HH:mm"),
    },
    {
      title: "Clock Out",
      dataIndex: "clockOut",
      key: "clockOut",
      render: (text: string) =>
        text ? moment(text).format("YYYY-MM-DD HH:mm") : "-",
    },
    { title: "Clock In Note", dataIndex: "clockInNote", key: "clockInNote" },
    {
      title: "Clock Out Note",
      dataIndex: "clockOutNote",
      key: "clockOutNote",
    },
  ];

  return (
    // Render the PDF preview
    <div>
      <Flex justify="space-between" align="center" style={{ marginTop: 24 }}>
        <Flex>
          <Button
            onClick={() => confirmExport("PDF")}
            style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
          >
            Export PDF
          </Button>
          <Button
            onClick={() => confirmExport("CSV")}
            style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
          >
            Export CSV
          </Button>
        </Flex>
      </Flex>
      <Table
        style={{ marginTop: 24, marginBottom: 24 }}
        columns={columns}
        dataSource={displayData}
        pagination={false}
        rowKey={(record) =>
          record.id === "placeholder"
            ? "placeholder"
            : `${record.id}-${record.clockIn}`
        } // Ensure unique key
      />
    </div>
  );
}
