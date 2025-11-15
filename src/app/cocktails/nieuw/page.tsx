import { CocktailEditor } from "@/components/CocktailEditor";
import { CocktailModal } from "@/components/CocktailModal";

export default function NewCocktailPage() {
  return (
    <CocktailModal maxWidth="2xl">
      <CocktailEditor mode="create" />
    </CocktailModal>
  );
}
