import {requireChatGPTUser} from "../chatgpt-auth";
import SettingsClient from "./settings-client";
import "./settings.css";
export const dynamic="force-dynamic";
export default async function SettingsPage(){await requireChatGPTUser("/settings");return <SettingsClient/>}
