"use client";
import {FormEvent,useEffect,useState} from "react";
type Row=Record<string,string|number|null>;
type ClaimResponse={claims?:Row[];canExecutiveApprove?:boolean};

export default function AcademyClient(){
  const [context,setContext]=useState<{selected?:Row;academies?:Row[]}>({}),[claims,setClaims]=useState<Row[]>([]),[staff,setStaff]=useState<{members?:Row[];invitations?:Row[]}>({}),[canApprove,setCanApprove]=useState(false),[notice,setNotice]=useState("");
  async function load(){
    const [c,claimResponse]=await Promise.all([
      fetch("/api/academy-context").then(r=>r.ok?r.json():{}),
      fetch("/api/academies/claims").then(r=>r.ok?r.json():{}) as Promise<ClaimResponse>
    ]);
    setContext(c);setClaims(claimResponse.claims||[]);setCanApprove(Boolean(claimResponse.canExecutiveApprove));
    const s=await fetch("/api/academies/staff");if(s.ok)setStaff(await s.json());
  }
  useEffect(()=>{void load()},[]);
  async function submit(e:FormEvent<HTMLFormElement>,path:string,method="POST"){
    e.preventDefault();
    const r=await fetch(path,{method,headers:{"content-type":"application/json"},body:JSON.stringify(Object.fromEntries(new FormData(e.currentTarget)))}),body=await r.json().catch(()=>({}));
    setNotice(r.ok?String(body.message||"Request recorded."):String(body.error||"Request could not be completed."));
    if(r.ok){e.currentTarget.reset();void load();}
  }
  const pending=claims.filter(c=>["submitted","review_required"].includes(String(c.status)));
  return <main className="academy-control">
    <header><div><p>ENTITY CONTROL</p><h1>Academy Registration & Authority</h1><span>Register the organization. Verify authority. Govern staff access.</span></div><a href="/network">Return to network →</a></header>
    {notice&&<div className="academy-notice" role="status">{notice}</div>}
    <section className="academy-overview"><article><strong>{context.academies?.length||0}</strong><span>Authorized academies</span></article><article><strong>{claims.length}</strong><span>Claims submitted</span></article><article><strong>{staff.members?.length||0}</strong><span>Active staff</span></article><article><strong>{staff.invitations?.length||0}</strong><span>Invitations</span></article></section>
    <section className="academy-columns">
      <form onSubmit={e=>submit(e,"/api/academies/claims")}><p>CLAIM OR REGISTER</p><h2>Establish academy authority</h2><label>Academy legal or operating name<input name="academyName" required/></label><label>Your name<input name="claimantName" required/></label><label>Your title or relationship<input name="claimantTitle" placeholder="Owner, director, head instructor" required/></label><label>Evidence type<select name="evidenceType"><option value="business_record">Business registration</option><option value="domain_email">Organization-domain email</option><option value="facility_record">Facility or lease record</option><option value="governing_body">Governing-body affiliation</option></select></label><label>Evidence reference<textarea name="evidenceReference" placeholder="Provide the public reference, registration identifier, or verification instructions." required/></label><div className="academy-warning"><b>No immediate access</b><span>Claims undergo independent verification before administrative authority is granted.</span></div><button>Submit governed claim</button></form>
      <form onSubmit={e=>submit(e,"/api/academies/staff")}><p>STAFF ACCESS</p><h2>Invite an authorized member</h2>{context.selected?<><div className="selected-academy"><small>SELECTED ACADEMY</small><strong>{String(context.selected.academyName)}</strong><span>{String(context.selected.role)}</span></div><label>Staff email<input name="email" type="email" required/></label><label>Role<select name="role"><option value="coach">Coach</option><option value="admin">Administrator</option><option value="parent">Parent / guardian</option><option value="viewer">Reviewer</option></select></label><button>Create invitation</button></>:<div className="academy-warning"><b>Verified academy required</b><span>Staff invitations become available after an academy claim is approved and membership authority is established.</span></div>}<h3>Access doctrine</h3><ul><li>Identity authentication is separate from academy authorization.</li><li>Every user receives least-privilege access.</li><li>Invitations expire after seven days.</li><li>Role changes and removals remain auditable.</li></ul></form>
    </section>
    {canApprove&&<section className="executive-approval"><div><p>EXECUTIVE AUTHORITY</p><h2>Founder application approval</h2><span>Accept a submitted academy application, lock the decision, and grant the claimant academy-admin authority.</span></div><form onSubmit={e=>submit(e,"/api/academies/claims","PATCH")}><label>Pending application<select name="claimId" required><option value="">Select an application</option>{pending.map(c=><option key={String(c.id)} value={String(c.id)}>{String(c.academyName)} — {String(c.claimantName)}</option>)}</select></label><label>Executive approval code <small>Optional while governance is unlocked</small><input name="approvalCode" type="password" autoComplete="off"/></label><button disabled={!pending.length}>Accept & lock application</button></form><div className="academy-warning"><b>BB · Founder Approved</b><span>This authority applies only to academy entity applications. Athlete verification, age and belt records, guardian consent, media permissions, safeguarding, and payments remain separately governed.</span></div></section>}
    {claims.length>0&&<section className="claim-ledger"><p>VERIFICATION LEDGER</p><h2>{canApprove?"Academy application register":"Your academy claims"}</h2>{claims.map(c=><article key={String(c.id)}><div><b>{String(c.academyName)}</b><span>{String(c.claimantTitle)}</span>{c.reviewedBy&&<small>{String(c.reviewedBy)}</small>}</div><em>{String(c.status)}</em><small>{String(c.riskStatus)}</small></article>)}</section>}
  </main>;
}
