import { requireChatGPTUser } from "../../chatgpt-auth";
import PayoutsClient from "./payouts-client";
import "./payouts.css";
export const dynamic = "force-dynamic";
export default async function PayoutsPage() {
  await requireChatGPTUser("/academy/payouts");
  return <PayoutsClient />;
}
