export default function BackgroundWrapper({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return (
    <div
      style={{ height: "100vh", width: "100vw", backgroundColor: "#ffffff" }}
    >
      <div
        style={{
          width: "256px",
          height: "256px",
          borderRadius: "100%",
          backgroundColor: "#37F5FF",
          filter: "blur(132px)",
          flexShrink: 0,
          position: "absolute",
          top: "34px",
          left: "-36px",
          zIndex: 0,
        }}
      ></div>
      <div
        style={{
          width: "256px",
          height: "256px",
          borderRadius: "100%",
          backgroundColor: "#71C9FE",
          filter: "blur(132px)",
          flexShrink: 0,
          position: "absolute",
          top: "96px",
          right: "-24px",
          zIndex: 0,
        }}
      ></div>
      <div
        style={{
          width: "256px",
          height: "256px",
          borderRadius: "100%",
          backgroundColor: "#A2B9FF",
          filter: "blur(132px)",
          flexShrink: 0,
          position: "absolute",
          top: "0px",
          right: "0px",
          zIndex: 0,
        }}
      ></div>
      {children}
    </div>
  );
}
