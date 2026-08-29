import NetworkClient from "./network-client";
import { requireChatGPTUser } from "../chatgpt-auth";
import "./network.css";
export const dynamic = "force-dynamic";
export default async function NetworkPage() {
  await requireChatGPTUser("/network");
  return <NetworkClient />;
}
