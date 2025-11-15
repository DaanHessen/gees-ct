import { CocktailEditor } from "@/components/CocktailEditor";
import { CocktailModal } from "@/components/CocktailModal";

type PageProps = {
  params: { id: string };
};

export default function EditCocktailPage({ params }: PageProps) {
  return (
    <CocktailModal maxWidth="2xl">
      <CocktailEditor mode="edit" cocktailId={params.id} />
    </CocktailModal>
  );
}
