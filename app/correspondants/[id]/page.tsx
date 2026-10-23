import CorrespondantDetails from "@/app/components/CorrespondantDetails";

type CorrespondantPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CorrespondantPage({
  params,
}: CorrespondantPageProps) {
  const { id } = await params;

  return <CorrespondantDetails id={id} />;
}
