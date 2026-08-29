import AcademyClient from "./academy-client";
import {requireChatGPTUser} from "../chatgpt-auth";
import "./academy.css";
export const dynamic="force-dynamic";
export default async function AcademyPage(){await requireChatGPTUser("/academy");return <AcademyClient/>}
