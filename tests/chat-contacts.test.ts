import { describe, expect, it } from "vitest";
import { AuthService } from "../server/modules/auth/auth.service";
import type { User } from "../server/database/entities";

describe("Chat Contacts Filtering", () => {
  it("returns registered doctors belonging to the same facility for an ASHA worker", async () => {
    const mockUsers: User[] = [
      {
        id: 1,
        openId: "doc1",
        name: "Doctor 1",
        role: "CHIEF_DOCTOR",
        hospitalId: 1,
      } as User,
      {
        id: 2,
        openId: "doc2",
        name: "Doctor 2",
        role: "DOCTOR",
        hospitalId: 1,
      } as User,
      {
        id: 3,
        openId: "doc3_other_facility",
        name: "Doctor 3 Other",
        role: "DOCTOR",
        hospitalId: 2,
      } as User,
      {
        id: 10,
        openId: "asha_worker",
        name: "Sunita (ASHA)",
        role: "ASHA_WORKER",
        hospitalId: 1,
      } as User,
    ];

    const mockRepo: any = {
      find: async ({ where }: any) => {
        return mockUsers.filter((u) => u.hospitalId === where.hospitalId);
      },
    };

    const authService = new AuthService(mockRepo, {} as any);

    const ashaUser = mockUsers.find((u) => u.id === 10)!;
    const contacts = await authService.getChatContacts(ashaUser, ashaUser.hospitalId);

    // Should include Doctor 1 and Doctor 2 from facility 1
    expect(contacts.map((c) => c.id)).toContain(1);
    expect(contacts.map((c) => c.id)).toContain(2);

    // Should NOT include doctor from another facility
    expect(contacts.map((c) => c.id)).not.toContain(3);

    // Should NOT include the logged-in ASHA worker herself
    expect(contacts.map((c) => c.id)).not.toContain(10);

    // Names and roles are properly formatted
    const doc1 = contacts.find((c) => c.id === 1);
    expect(doc1).toEqual({ id: 1, name: "Doctor 1", role: "CHIEF_DOCTOR" });
  });

  it("returns other doctors and health staff belonging to the same facility for a doctor", async () => {
    const mockUsers: User[] = [
      {
        id: 1,
        openId: "doc1",
        name: "Doctor 1",
        role: "CHIEF_DOCTOR",
        hospitalId: 1,
      } as User,
      {
        id: 2,
        openId: "doc2",
        name: "Doctor 2",
        role: "DOCTOR",
        hospitalId: 1,
      } as User,
      {
        id: 10,
        openId: "asha_worker",
        name: "Sunita (ASHA)",
        role: "ASHA_WORKER",
        hospitalId: 1,
      } as User,
    ];

    const mockRepo: any = {
      find: async ({ where }: any) => {
        return mockUsers.filter((u) => u.hospitalId === where.hospitalId);
      },
    };

    const authService = new AuthService(mockRepo, {} as any);

    const doc1 = mockUsers.find((u) => u.id === 1)!;
    const contacts = await authService.getChatContacts(doc1, doc1.hospitalId);

    // Doctor 1 should see Doctor 2 and the ASHA worker
    expect(contacts.map((c) => c.id)).toContain(2);
    expect(contacts.map((c) => c.id)).toContain(10);
    expect(contacts.map((c) => c.id)).not.toContain(1);
  });
});
