import { afterEach, describe, expect, it, vi } from "vitest";
import { createCalendarEvent, deleteCalendarEvent, updateCalendarEvent } from "../google-calendar";

function mockFetchOnce(body: unknown, ok = true) {
  const fetchMock = vi.fn().mockResolvedValue({ ok, status: ok ? 200 : 404, json: async () => body });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createCalendarEvent",()=>{
  it("requests a Meet link and notifies attendees when withMeet is set",async()=>{
    const fetchMock=mockFetchOnce({id:"evt1",htmlLink:"https://calendar.google.com/evt1",hangoutLink:"https://meet.google.com/abc"});
    await createCalendarEvent({accessToken:"tok",summary:"Fitting call",startIso:"2026-08-12T15:30:00.000Z",endIso:"2026-08-12T16:00:00.000Z",timeZone:"UTC",attendees:["a@example.com","b@example.com"],withMeet:true,requestId:"req1"});
    const [url,init]=fetchMock.mock.calls[0];
    expect(String(url)).toContain("conferenceDataVersion=1");
    expect(String(url)).toContain("sendUpdates=all");
    const body=JSON.parse(init.body);
    expect(body.conferenceData.createRequest.requestId).toBe("req1");
    expect(body.attendees).toEqual([{email:"a@example.com"},{email:"b@example.com"}]);
    expect(body.start).toEqual({dateTime:"2026-08-12T15:30:00.000Z",timeZone:"UTC"});
  });

  it("builds a real all-day event (date, not dateTime) for milestone reminders",async()=>{
    const fetchMock=mockFetchOnce({id:"evt2",htmlLink:"https://calendar.google.com/evt2"});
    await createCalendarEvent({accessToken:"tok",summary:"Order due",allDay:true,startDate:"2026-08-20",endDate:"2026-08-21"});
    const [url,init]=fetchMock.mock.calls[0];
    expect(String(url)).not.toContain("sendUpdates=all");
    const body=JSON.parse(init.body);
    expect(body.start).toEqual({date:"2026-08-20"});
    expect(body.end).toEqual({date:"2026-08-21"});
  });

  it("does not request Meet or attendee updates for a personal reminder",async()=>{
    const fetchMock=mockFetchOnce({id:"evt3",htmlLink:"https://calendar.google.com/evt3"});
    await createCalendarEvent({accessToken:"tok",summary:"Check delivery",startIso:"2026-08-20T00:00:00.000Z",endIso:"2026-08-20T00:30:00.000Z",timeZone:"UTC",reminders:[{method:"popup",minutes:60}]});
    const [url,init]=fetchMock.mock.calls[0];
    expect(String(url)).not.toContain("conferenceDataVersion");
    expect(String(url)).not.toContain("sendUpdates");
    const body=JSON.parse(init.body);
    expect(body.conferenceData).toBeUndefined();
    expect(body.reminders).toEqual({useDefault:false,overrides:[{method:"popup",minutes:60}]});
  });
});

describe("updateCalendarEvent",()=>{
  it("PATCHes the existing event id",async()=>{
    const fetchMock=mockFetchOnce({id:"evt1",htmlLink:"https://calendar.google.com/evt1"});
    await updateCalendarEvent({accessToken:"tok",eventId:"evt1",summary:"Fitting call",startIso:"2026-08-12T15:30:00.000Z",endIso:"2026-08-12T16:00:00.000Z",timeZone:"UTC"});
    const [url,init]=fetchMock.mock.calls[0];
    expect(String(url)).toContain("/events/evt1");
    expect(init.method).toBe("PATCH");
  });
});

describe("deleteCalendarEvent",()=>{
  it("notifies attendees when notifyAttendees is true",async()=>{
    const fetchMock=mockFetchOnce({});
    await deleteCalendarEvent({accessToken:"tok",eventId:"evt1",notifyAttendees:true});
    const [url]=fetchMock.mock.calls[0];
    expect(String(url)).toContain("sendUpdates=all");
  });

  it("omits sendUpdates for personal (non-shared) events",async()=>{
    const fetchMock=mockFetchOnce({});
    await deleteCalendarEvent({accessToken:"tok",eventId:"evt1"});
    const [url]=fetchMock.mock.calls[0];
    expect(String(url)).not.toContain("sendUpdates");
  });

  it("swallows an already-gone event instead of throwing",async()=>{
    mockFetchOnce({error:{message:"Not found"}},false);
    await expect(deleteCalendarEvent({accessToken:"tok",eventId:"evt1"})).resolves.toBeUndefined();
  });
});
