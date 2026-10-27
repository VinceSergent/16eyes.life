export const metadata = {
  title: "16eyes",
  description: "16eyes. Houston.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#000", color: "#fff" }}>{children}</body>
    </html>
  );
}
