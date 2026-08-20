import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState, ErrorState, StatTile } from "@/components/Bits";
import { LoadingVeil } from "@/components/Guards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "@/lib/api";
import { formatPrice } from "@/lib/fd";
import { StaffFrame } from "@/pages/InstructorDashboard";
import type {
  AdminOverview,
  CertStatus,
  Certification,
  Course,
  LearningResource,
  Role,
  User,
} from "@/lib/types";

const ROLES: Role[] = ["student", "instructor", "admin"];

export default function AdminDashboard() {
  return (
    <StaffFrame title="Admin">
      <h1 className="heading text-2xl font-semibold" data-testid="admin-title">
        School administration
      </h1>
      <Tabs defaultValue="overview" className="mt-6">
        <TabsList variant="line" data-testid="admin-tabs">
          <TabsTrigger value="overview" data-testid="admin-tab-overview">
            Overview
          </TabsTrigger>
          <TabsTrigger value="users" data-testid="admin-tab-users">
            Users
          </TabsTrigger>
          <TabsTrigger value="courses" data-testid="admin-tab-courses">
            Courses
          </TabsTrigger>
          <TabsTrigger value="resources" data-testid="admin-tab-resources">
            Learning
          </TabsTrigger>
          <TabsTrigger value="certifications" data-testid="admin-tab-certifications">
            Certifications
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="pt-6">
          <OverviewPanel />
        </TabsContent>
        <TabsContent value="users" className="pt-6">
          <UsersPanel />
        </TabsContent>
        <TabsContent value="courses" className="pt-6">
          <CoursesPanel />
        </TabsContent>
        <TabsContent value="resources" className="pt-6">
          <ResourcesPanel />
        </TabsContent>
        <TabsContent value="certifications" className="pt-6">
          <CertificationsPanel />
        </TabsContent>
      </Tabs>
    </StaffFrame>
  );
}

function OverviewPanel() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => apiGet<AdminOverview>("/admin/overview"),
    retry: false,
  });

  if (isLoading) return <LoadingVeil label="Loading overview" />;
  if (isError || !data) return <ErrorState testid="admin-overview-error" />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5" data-testid="admin-overview-stats">
        <StatTile label="Students" value={String(data.total_students)} testid="admin-stat-students" />
        <StatTile
          label="Instructors"
          value={String(data.total_instructors)}
          testid="admin-stat-instructors"
        />
        <StatTile
          label="Active courses"
          value={String(data.active_courses)}
          testid="admin-stat-courses"
        />
        <StatTile label="Dive logs" value={String(data.total_dive_logs)} testid="admin-stat-dives" />
        <StatTile
          label="Training sessions"
          value={String(data.total_training_sessions)}
          testid="admin-stat-training"
        />
      </div>
      <section>
        <h2 className="heading text-sm tracking-[0.18em] uppercase">Recent registrations</h2>
        <ul className="mt-3 space-y-2" data-testid="admin-recent-registrations">
          {data.recent_registrations.map((user) => (
            <li
              key={user.id}
              className="flex items-center justify-between rounded-xl border border-white/6 bg-card px-4 py-3 text-sm"
            >
              <span>{user.name}</span>
              <span className="text-xs text-muted-foreground">{user.email}</span>
              <Badge variant="secondary">{user.role}</Badge>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function UsersPanel() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => apiGet<User[]>("/admin/users"),
    retry: false,
  });

  const setRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) =>
      apiPatch<User>(`/admin/users/${id}`, { role }),
    onSuccess: async () => {
      toast.success("Role updated.");
      await qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: () => toast.error("Could not update this role."),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/admin/users/${id}`),
    onSuccess: async () => {
      toast.success("User deleted.");
      await qc.invalidateQueries({ queryKey: ["admin-users"] });
      await qc.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: () => toast.error("Could not delete this user."),
  });

  if (isLoading) return <LoadingVeil label="Loading users" />;
  if (isError) return <ErrorState testid="admin-users-error" />;

  return (
    <ul className="space-y-2" data-testid="admin-users-list">
      {(data ?? []).map((user) => (
        <li
          key={user.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/6 bg-card px-4 py-3"
          data-testid={`admin-user-row-${user.id}`}
        >
          <div className="min-w-0">
            <p className="text-sm">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={user.role}
              onValueChange={(role: string) => setRole.mutate({ id: user.id, role: role as Role })}
            >
              <SelectTrigger className="min-w-32" data-testid={`admin-user-role-${user.id}`}>
                <SelectValue>{(v) => String(v)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => remove.mutate(user.id)}
              data-testid={`admin-user-delete-${user.id}`}
              aria-label="Delete user"
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

interface CourseDraft {
  id: string | null;
  title: string;
  level: string;
  tagline: string;
  short_description: string;
  description: string;
  price: string;
  duration: string;
  max_depth: string;
  requirements: string;
  learn_topics: string;
  schedule: string;
  image_url: string;
  certification_agency: string;
  certification_level: string;
  status: "active" | "inactive";
}

const BLANK_COURSE: CourseDraft = {
  id: null,
  title: "",
  level: "Level 1",
  tagline: "",
  short_description: "",
  description: "",
  price: "0",
  duration: "",
  max_depth: "",
  requirements: "",
  learn_topics: "",
  schedule: "",
  image_url: "",
  certification_agency: "",
  certification_level: "",
  status: "active",
};

function CoursesPanel() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<CourseDraft | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: () => apiGet<Course[]>("/courses?include_inactive=true"),
    retry: false,
  });

  const save = useMutation({
    mutationFn: (body: Record<string, unknown> & { id: string | null }) =>
      body.id
        ? apiPut<Course>(`/courses/${body.id}`, body)
        : apiPost<Course>("/courses", body),
    onSuccess: async () => {
      setDraft(null);
      toast.success("Course saved.");
      await qc.invalidateQueries();
    },
    onError: () => toast.error("Could not save this course."),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/courses/${id}`),
    onSuccess: async () => {
      toast.success("Course deleted.");
      await qc.invalidateQueries();
    },
    onError: () => toast.error("Could not delete this course."),
  });

  if (isLoading) return <LoadingVeil label="Loading courses" />;
  if (isError) return <ErrorState testid="admin-courses-error" />;

  return (
    <div className="space-y-4">
      <Button size="sm" onClick={() => setDraft(BLANK_COURSE)} data-testid="admin-course-new-button">
        <Plus className="size-4" /> New course
      </Button>

      {data && data.length === 0 ? (
        <EmptyState testid="admin-courses-empty" title="No courses yet." />
      ) : null}

      <ul className="space-y-2" data-testid="admin-courses-list">
        {(data ?? []).map((course) => (
          <li
            key={course.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/6 bg-card px-4 py-3"
            data-testid={`admin-course-row-${course.slug}`}
          >
            <div className="min-w-0">
              <p className="text-sm">{course.title}</p>
              <p className="text-xs text-muted-foreground">
                {course.level} · {formatPrice(course.price, course.currency)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={course.status === "active" ? "default" : "outline"}>
                {course.status}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  save.mutate({
                    ...course,
                    id: course.id,
                    status: course.status === "active" ? "inactive" : "active",
                  })
                }
                data-testid={`admin-course-toggle-${course.slug}`}
              >
                {course.status === "active" ? "Disable" : "Enable"}
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() =>
                  setDraft({
                    id: course.id,
                    title: course.title,
                    level: course.level,
                    tagline: course.tagline,
                    short_description: course.short_description,
                    description: course.description,
                    price: String(course.price),
                    duration: course.duration,
                    max_depth: course.max_depth ?? "",
                    requirements: course.requirements.join("\n"),
                    learn_topics: course.learn_topics.join("\n"),
                    schedule: course.schedule ?? "",
                    image_url: course.image_url,
                    certification_agency: course.certification_agency ?? "",
                    certification_level: course.certification_level ?? "",
                    status: course.status,
                  })
                }
                data-testid={`admin-course-edit-${course.slug}`}
                aria-label="Edit course"
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => remove.mutate(course.id)}
                data-testid={`admin-course-delete-${course.slug}`}
                aria-label="Delete course"
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto" data-testid="admin-course-dialog">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit course" : "New course"}</DialogTitle>
          </DialogHeader>
          {draft ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Title *" value={draft.title} onChange={(v) => setDraft({ ...draft, title: v })} testid="admin-course-title-input" />
              <TextField label="Level" value={draft.level} onChange={(v) => setDraft({ ...draft, level: v })} testid="admin-course-level-input" />
              <TextField label="Price" value={draft.price} onChange={(v) => setDraft({ ...draft, price: v })} testid="admin-course-price-input" />
              <TextField label="Duration" value={draft.duration} onChange={(v) => setDraft({ ...draft, duration: v })} testid="admin-course-duration-input" />
              <TextField label="Max depth" value={draft.max_depth} onChange={(v) => setDraft({ ...draft, max_depth: v })} testid="admin-course-depth-input" />
              <TextField label="Schedule" value={draft.schedule} onChange={(v) => setDraft({ ...draft, schedule: v })} testid="admin-course-schedule-input" />
              <TextField label="Certification agency" value={draft.certification_agency} onChange={(v) => setDraft({ ...draft, certification_agency: v })} testid="admin-course-agency-input" />
              <TextField label="Certification level" value={draft.certification_level} onChange={(v) => setDraft({ ...draft, certification_level: v })} testid="admin-course-cert-level-input" />
              <div className="sm:col-span-2">
                <TextField label="Image URL" value={draft.image_url} onChange={(v) => setDraft({ ...draft, image_url: v })} testid="admin-course-image-input" />
              </div>
              <div className="sm:col-span-2">
                <TextField label="Tagline" value={draft.tagline} onChange={(v) => setDraft({ ...draft, tagline: v })} testid="admin-course-tagline-input" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs">Short description</Label>
                <Textarea
                  rows={2}
                  value={draft.short_description}
                  onChange={(e) => setDraft({ ...draft, short_description: e.target.value })}
                  data-testid="admin-course-short-description-input"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs">Description</Label>
                <Textarea
                  rows={3}
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  data-testid="admin-course-description-input"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Requirements (one per line)</Label>
                <Textarea
                  rows={3}
                  value={draft.requirements}
                  onChange={(e) => setDraft({ ...draft, requirements: e.target.value })}
                  data-testid="admin-course-requirements-input"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Learning topics (one per line)</Label>
                <Textarea
                  rows={3}
                  value={draft.learn_topics}
                  onChange={(e) => setDraft({ ...draft, learn_topics: e.target.value })}
                  data-testid="admin-course-topics-input"
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" data-testid="admin-course-cancel-button" />}>
              Cancel
            </DialogClose>
            <Button
              onClick={() => {
                if (!draft) return;
                if (draft.title.trim().length < 2) {
                  toast.error("A course needs a title.");
                  return;
                }
                const price = Number(draft.price);
                if (Number.isNaN(price) || price < 0) {
                  toast.error("Price must be a positive number.");
                  return;
                }
                save.mutate({
                  id: draft.id,
                  title: draft.title.trim(),
                  level: draft.level,
                  tagline: draft.tagline,
                  short_description: draft.short_description,
                  description: draft.description,
                  price,
                  currency: "IDR",
                  duration: draft.duration,
                  max_depth: draft.max_depth || null,
                  learn_topics: draft.learn_topics.split("\n").filter(Boolean),
                  structure: [],
                  requirements: draft.requirements.split("\n").filter(Boolean),
                  certification_agency: draft.certification_agency || null,
                  certification_level: draft.certification_level || null,
                  certification_requirements: [],
                  schedule: draft.schedule || null,
                  image_url: draft.image_url,
                  status: draft.status,
                });
              }}
              disabled={save.isPending}
              data-testid="admin-course-save-button"
            >
              Save course
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ResourceDraft {
  id: string | null;
  title: string;
  organization: string;
  level: string;
  description: string;
  category: string;
  resource_type: string;
  resource_url: string;
  is_active: boolean;
  access_agency: string;
  minimum_access_level: string;
  resource_access_type: string;
}

const BLANK_RESOURCE: ResourceDraft = {
  id: null,
  title: "",
  organization: "",
  level: "",
  description: "",
  category: "School Materials",
  resource_type: "link",
  resource_url: "",
  is_active: true,
  access_agency: "AIDA",
  minimum_access_level: "AIDA 1",
  resource_access_type: "certification_level",
};

const ACCESS_TYPES = ["certification_level", "course_enrollment", "admin_only", "public"];

const RESOURCE_TYPES = ["manual", "pdf", "link", "video"];

function ResourcesPanel() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<ResourceDraft | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-resources"],
    queryFn: () => apiGet<LearningResource[]>("/learning-resources?include_inactive=true"),
    retry: false,
  });

  const save = useMutation({
    mutationFn: (body: ResourceDraft) =>
      body.id
        ? apiPut<LearningResource>(`/learning-resources/${body.id}`, body)
        : apiPost<LearningResource>("/learning-resources", body),
    onSuccess: async () => {
      setDraft(null);
      toast.success("Resource saved.");
      await qc.invalidateQueries();
    },
    onError: () => toast.error("Could not save this resource."),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/learning-resources/${id}`),
    onSuccess: async () => {
      toast.success("Resource deleted.");
      await qc.invalidateQueries();
    },
    onError: () => toast.error("Could not delete this resource."),
  });

  if (isLoading) return <LoadingVeil label="Loading resources" />;
  if (isError) return <ErrorState testid="admin-resources-error" />;

  return (
    <div className="space-y-4">
      <Button
        size="sm"
        onClick={() => setDraft(BLANK_RESOURCE)}
        data-testid="admin-resource-new-button"
      >
        <Plus className="size-4" /> New resource
      </Button>

      <p className="text-xs text-muted-foreground">
        Only link to official, licensed or authorized documents. This app never hosts or copies
        agency manuals.
      </p>

      <ul className="space-y-2" data-testid="admin-resources-list">
        {(data ?? []).map((resource) => (
          <li
            key={resource.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/6 bg-card px-4 py-3"
            data-testid={`admin-resource-row-${resource.id}`}
          >
            <div className="min-w-0">
              <p className="text-sm">{resource.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {resource.category} · {resource.resource_type} ·{" "}
                {resource.resource_access_type === "certification_level"
                  ? `min ${resource.minimum_access_level ?? "—"}`
                  : resource.resource_access_type}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={resource.is_active ? "default" : "outline"}>
                {resource.is_active ? "active" : "inactive"}
              </Badge>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() =>
                  setDraft({
                    id: resource.id,
                    title: resource.title,
                    organization: resource.organization ?? "",
                    level: resource.level ?? "",
                    description: resource.description ?? "",
                    category: resource.category,
                    resource_type: resource.resource_type,
                    resource_url: resource.resource_url,
                    is_active: resource.is_active,
                    access_agency: resource.access_agency ?? "AIDA",
                    minimum_access_level: resource.minimum_access_level ?? "AIDA 1",
                    resource_access_type: resource.resource_access_type ?? "certification_level",
                  })
                }
                data-testid={`admin-resource-edit-${resource.id}`}
                aria-label="Edit resource"
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => remove.mutate(resource.id)}
                data-testid={`admin-resource-delete-${resource.id}`}
                aria-label="Delete resource"
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent data-testid="admin-resource-dialog">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit resource" : "New resource"}</DialogTitle>
          </DialogHeader>
          {draft ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Title *" value={draft.title} onChange={(v) => setDraft({ ...draft, title: v })} testid="admin-resource-title-input" />
              <TextField label="Organization" value={draft.organization} onChange={(v) => setDraft({ ...draft, organization: v })} testid="admin-resource-org-input" />
              <TextField label="Level" value={draft.level} onChange={(v) => setDraft({ ...draft, level: v })} testid="admin-resource-level-input" />
              <TextField label="Category" value={draft.category} onChange={(v) => setDraft({ ...draft, category: v })} testid="admin-resource-category-input" />
              <div className="space-y-2">
                <Label className="text-xs">Resource type</Label>
                <Select
                  value={draft.resource_type}
                  onValueChange={(value: string) => setDraft({ ...draft, resource_type: value })}
                >
                  <SelectTrigger data-testid="admin-resource-type-select">
                    <SelectValue>{(v) => String(v)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {RESOURCE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Status</Label>
                <Select
                  value={draft.is_active ? "active" : "inactive"}
                  onValueChange={(value: string) =>
                    setDraft({ ...draft, is_active: value === "active" })
                  }
                >
                  <SelectTrigger data-testid="admin-resource-status-select">
                    <SelectValue>{(v) => String(v)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">active</SelectItem>
                    <SelectItem value="inactive">inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Minimum access level</Label>
                <Select
                  value={draft.minimum_access_level}
                  onValueChange={(value: string) =>
                    setDraft({ ...draft, minimum_access_level: value })
                  }
                >
                  <SelectTrigger data-testid="admin-resource-min-level-select">
                    <SelectValue>{(v) => String(v)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {AIDA_LEVELS.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Access type</Label>
                <Select
                  value={draft.resource_access_type}
                  onValueChange={(value: string) =>
                    setDraft({ ...draft, resource_access_type: value })
                  }
                >
                  <SelectTrigger data-testid="admin-resource-access-type-select">
                    <SelectValue>{(v) => String(v).replace(/_/g, " ")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {ACCESS_TYPES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <TextField label="Resource URL *" value={draft.resource_url} onChange={(v) => setDraft({ ...draft, resource_url: v })} testid="admin-resource-url-input" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs">Description</Label>
                <Textarea
                  rows={3}
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  data-testid="admin-resource-description-input"
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" data-testid="admin-resource-cancel-button" />}>
              Cancel
            </DialogClose>
            <Button
              onClick={() => {
                if (!draft) return;
                if (!draft.title.trim() || !draft.resource_url.trim()) {
                  toast.error("Title and resource URL are required.");
                  return;
                }
                save.mutate(draft);
              }}
              disabled={save.isPending}
              data-testid="admin-resource-save-button"
            >
              Save resource
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  testid,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  testid: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} data-testid={testid} />
    </div>
  );
}

const CERT_STATUSES: CertStatus[] = ["pending", "verified", "expired", "rejected"];
const AIDA_LEVELS = ["AIDA 1", "AIDA 2", "AIDA 3", "AIDA 4"];

function CertificationsPanel() {
  const qc = useQueryClient();
  const [studentId, setStudentId] = useState("");
  const [level, setLevel] = useState("AIDA 2");
  const [search, setSearch] = useState("");

  const certs = useQuery({
    queryKey: ["admin-certifications"],
    queryFn: () => apiGet<Certification[]>("/admin/certifications"),
    retry: false,
  });
  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => apiGet<User[]>("/admin/users"),
    retry: false,
  });

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ["admin-certifications"] });
    await qc.invalidateQueries({ queryKey: ["learning-resources"] });
    await qc.invalidateQueries({ queryKey: ["learning-summary"] });
  };

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: CertStatus }) =>
      apiPatch<Certification>(`/admin/certifications/${id}`, { status }),
    onSuccess: async () => {
      toast.success("Certification status updated — learning access follows immediately.");
      await invalidate();
    },
    onError: () => toast.error("Could not update this certification."),
  });

  const setLevelFor = useMutation({
    mutationFn: ({ id, certification }: { id: string; certification: string }) =>
      apiPatch<Certification>(`/admin/certifications/${id}`, { certification }),
    onSuccess: async () => {
      toast.success("Certification level corrected.");
      await invalidate();
    },
    onError: () => toast.error("Could not change the level."),
  });

  const assign = useMutation({
    mutationFn: () =>
      apiPost<Certification>("/admin/certifications", {
        user_id: studentId,
        agency: "AIDA",
        certification: level,
        instructor: "John Doe",
        status: "verified",
      }),
    onSuccess: async () => {
      toast.success("Certification assigned and verified.");
      await invalidate();
    },
    onError: () => toast.error("Could not assign this certification."),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/admin/certifications/${id}`),
    onSuccess: async () => {
      toast.success("Certification removed.");
      await invalidate();
    },
    onError: () => toast.error("Could not remove this certification."),
  });

  if (certs.isLoading) return <LoadingVeil label="Loading certifications" />;
  if (certs.isError) return <ErrorState testid="admin-certifications-error" />;

  const term = search.trim().toLowerCase();
  const matches = (users.data ?? []).filter(
    (user) =>
      !term ||
      user.name.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term) ||
      user.role.toLowerCase().includes(term),
  );

  return (
    <div className="space-y-5">
      <div className="glass flex flex-wrap items-end gap-3 rounded-2xl px-5 py-5">
        <div className="min-w-56 flex-1 space-y-2">
          <Label className="text-xs">Find a diver</Label>
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by name, email or role"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setStudentId("");
              }}
              data-testid="admin-cert-user-search"
            />
          </div>
          <Select value={studentId} onValueChange={(value: string) => setStudentId(value)}>
            <SelectTrigger data-testid="admin-cert-user-select">
              <SelectValue>
                {(v) =>
                  (users.data ?? []).find((u) => u.id === v)?.name ?? "Select a diver"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {matches.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name} · {user.role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground" data-testid="admin-cert-user-match-count">
            {matches.length === 0
              ? "No diver matches that search."
              : `${matches.length} of ${(users.data ?? []).length} divers shown`}
          </p>
        </div>
        <div className="min-w-40 space-y-2">
          <Label className="text-xs">Certification</Label>
          <Select value={level} onValueChange={(value: string) => setLevel(value)}>
            <SelectTrigger data-testid="admin-cert-level-select">
              <SelectValue>{(v) => String(v)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {AIDA_LEVELS.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={() => {
            if (!studentId) {
              toast.error("Select a diver first.");
              return;
            }
            assign.mutate();
          }}
          disabled={assign.isPending}
          data-testid="admin-cert-assign-button"
        >
          <Plus className="size-4" /> Assign &amp; verify
        </Button>
      </div>

      <ul className="space-y-2" data-testid="admin-certifications-list">
        {(certs.data ?? []).map((cert) => (
          <li
            key={cert.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/6 bg-card px-4 py-3"
            data-testid={`admin-cert-row-${cert.id}`}
          >
            <div className="min-w-0">
              <p className="text-sm">{cert.user_name}</p>
              <p className="text-xs text-muted-foreground">
                {cert.agency} · rank {cert.rank}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={cert.status === "verified" ? "default" : "outline"}>
                {cert.status}
              </Badge>
              <Select
                value={cert.certification}
                onValueChange={(value: string) =>
                  setLevelFor.mutate({ id: cert.id, certification: value })
                }
              >
                <SelectTrigger className="min-w-28" data-testid={`admin-cert-level-${cert.id}`}>
                  <SelectValue>{(v) => String(v)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {AIDA_LEVELS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={cert.status}
                onValueChange={(value: string) =>
                  setStatus.mutate({ id: cert.id, status: value as CertStatus })
                }
              >
                <SelectTrigger className="min-w-32" data-testid={`admin-cert-status-${cert.id}`}>
                  <SelectValue>{(v) => String(v)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {CERT_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => remove.mutate(cert.id)}
                data-testid={`admin-cert-delete-${cert.id}`}
                aria-label="Delete certification"
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
