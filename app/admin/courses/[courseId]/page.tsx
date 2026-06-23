import CourseEditor from "@/components/admin/CourseEditor";

export default function AdminCourseDetailPage({ params }: { params: { courseId: string } }) {
  return <CourseEditor courseId={params.courseId} />;
}
