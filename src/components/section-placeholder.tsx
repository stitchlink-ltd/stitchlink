import { DashboardHeading, Panel } from "./dashboard-ui";
import { ButtonLink } from "./ui/button";
export function SectionPlaceholder({eyebrow,title,description,children,action}:{eyebrow:string;title:string;description:string;children?:React.ReactNode;action?:{label:string;href:string}}){return <div className="mx-auto max-w-6xl"><DashboardHeading eyebrow={eyebrow} title={title} description={description} action={action?<ButtonLink href={action.href}>{action.label}</ButtonLink>:undefined}/><Panel className="p-6 sm:p-8">{children}</Panel></div>}
