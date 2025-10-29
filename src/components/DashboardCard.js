import React from "react";
import "./DashboardCard.css";

function DashboardCard({ emoji, title, desc, color }) {
  return (
    <div
      style={{
        backgroundColor: color,
        padding: "20px",
        borderRadius: "12px",
        width: "250px",
        textAlign: "center",
        boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
      }}
    >
      <h2>{emoji} {title}</h2>
      <p>{desc}</p>
    </div>
  );
}

export default DashboardCard;
