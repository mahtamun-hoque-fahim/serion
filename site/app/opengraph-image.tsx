import { ImageResponse } from "next/og";

const MARK =
  "M69.5 0C107.884 0 139 31.159 139 69.5957C139 99.3934 120.299 124.816 94.0088 134.739C96.6614 105.497 53.936 80.9256 59.9307 57.5098C60.1963 56.5979 60.4264 55.7735 60.7852 54.8955C65.8449 42.5137 82.1217 39.3443 95.1689 44.0781C99.0831 45.4983 102.711 47.621 105.735 50.4326L106.524 48.5C102.246 44.8301 96.6472 42.2944 91.0557 40.2656C88.8192 39.4542 86.5464 38.7309 84.3672 38.041C58.5877 29.8975 34.8444 37.7187 27.9902 54.4912C27.4878 55.7206 27.0787 56.9842 26.7627 58.2812C19.2397 88.8084 64.9097 114.299 60.2949 138.585C26.2624 134.075 0 104.907 0 69.5957C8.23516e-05 31.159 31.1163 0 69.5 0ZM110.155 60.3047C102.979 57.7011 94.8469 61.1027 92.0479 67.9521C89.2847 74.7139 92.8953 82.3768 100.071 84.9805C107.247 87.584 115.379 84.1816 118.143 77.4199C120.941 70.5705 117.331 62.9085 110.155 60.3047Z";

export const dynamic = "force-static";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Serion — screen time, counted honestly";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#ffffff",
          padding: "64px 72px",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: -140,
            top: -160,
            width: 620,
            height: 620,
            borderRadius: "50%",
            background: "rgba(0,71,255,0.06)",
            display: "flex",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <svg width={34} height={34} viewBox="0 0 139 139" fill="#0047FF">
            <path d={MARK} />
          </svg>
          <div style={{ fontSize: 30, fontWeight: 700, color: "#0B0C0E", letterSpacing: -0.5 }}>
            Serion
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 78,
              fontWeight: 700,
              lineHeight: 1.04,
              letterSpacing: -2.5,
              color: "#0B0C0E",
            }}
          >
            <span>Screen time,</span>
            <span>counted honestly.</span>
          </div>
          <div style={{ fontSize: 27, color: "#5A616F" }}>
            See how long you actually used your computer today.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 24, color: "#5A616F" }}>
          <span>Windows 10 and 11</span>
          <span style={{ color: "#C3C8D1" }}>·</span>
          <span>1.6 MB</span>
          <span style={{ color: "#C3C8D1" }}>·</span>
          <span>Free and open source</span>
        </div>

        <div
          style={{
            position: "absolute",
            right: 88,
            bottom: 104,
            display: "flex",
            alignItems: "center",
            gap: 14,
            height: 68,
            padding: "0 26px 0 20px",
            borderRadius: 999,
            background: "#0047FF",
            color: "#fff",
            fontSize: 30,
            fontWeight: 600,
          }}
        >
          <svg width={26} height={26} viewBox="0 0 139 139" fill="#ffffff">
            <path d={MARK} />
          </svg>
          2.9h
        </div>
      </div>
    ),
    { ...size },
  );
}
