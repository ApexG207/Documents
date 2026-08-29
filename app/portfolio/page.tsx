import PortfolioClient from "./portfolio-client";
import { requireChatGPTUser } from "../chatgpt-auth";
import "./portfolio.css";
export const dynamic = "force-dynamic";
export default async function PortfolioPage() {
  await requireChatGPTUser("/portfolio");
  return <PortfolioClient />;
}
