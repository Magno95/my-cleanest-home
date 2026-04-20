import { useState } from 'react';
import { Package, Pencil, Save, Trash2, Wrench, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Spinner,
  cn,
} from '@mch/ui';
import { useReferenceData } from './use-reference-data.js';
import {
  useDeleteProduct,
  useDeleteTool,
  useSaveProduct,
  useSaveTool,
  type SaveProductInput,
  type SaveToolInput,
} from './use-reference-data-mutations.js';

const textareaClassName = cn(
  'min-h-[7rem] w-full rounded-xl border border-border-strong bg-background px-3 py-3 text-[15px] text-foreground',
  'placeholder:text-foreground-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
);

const emptyProductDraft: SaveProductInput = { name: '', brand: '', description: '' };
const emptyToolDraft: SaveToolInput = { name: '', description: '' };

export function ReferenceDataManager() {
  const referenceDataQuery = useReferenceData();
  const saveProduct = useSaveProduct();
  const deleteProduct = useDeleteProduct();
  const saveTool = useSaveTool();
  const deleteTool = useDeleteTool();

  const [productDraft, setProductDraft] = useState<SaveProductInput>(emptyProductDraft);
  const [toolDraft, setToolDraft] = useState<SaveToolInput>(emptyToolDraft);

  if (referenceDataQuery.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cleaning reference</CardTitle>
          <CardDescription>Reusable products and tools for item details.</CardDescription>
        </CardHeader>
        <CardContent className="flex h-40 items-center justify-center">
          <Spinner size={24} label="Loading reference data" />
        </CardContent>
      </Card>
    );
  }

  if (referenceDataQuery.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cleaning reference</CardTitle>
          <CardDescription>
            {referenceDataQuery.error instanceof Error
              ? referenceDataQuery.error.message
              : 'Failed to load products and tools.'}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { products, tools } = referenceDataQuery.data ?? {
    products: [],
    tools: [],
  };

  async function handleSaveProduct() {
    try {
      await saveProduct.mutateAsync(productDraft);
      toast.success(productDraft.id ? 'Product updated.' : 'Product created.');
      setProductDraft(emptyProductDraft);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save product.');
    }
  }

  async function handleDeleteProduct(id: string) {
    if (!window.confirm('Delete this product?')) return;
    try {
      await deleteProduct.mutateAsync(id);
      toast.success('Product deleted.');
      setProductDraft((current) => (current.id === id ? emptyProductDraft : current));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete product.');
    }
  }

  async function handleSaveTool() {
    try {
      await saveTool.mutateAsync(toolDraft);
      toast.success(toolDraft.id ? 'Tool updated.' : 'Tool created.');
      setToolDraft(emptyToolDraft);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save tool.');
    }
  }

  async function handleDeleteTool(id: string) {
    if (!window.confirm('Delete this tool?')) return;
    try {
      await deleteTool.mutateAsync(id);
      toast.success('Tool deleted.');
      setToolDraft((current) => (current.id === id ? emptyToolDraft : current));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete tool.');
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <EntityCard
        title="Products"
        description="Central product list selectable from each item detail."
        icon={<Package size={16} aria-hidden />}
        busy={saveProduct.isPending || deleteProduct.isPending}
        onCancel={() => setProductDraft(emptyProductDraft)}
        onSave={() => void handleSaveProduct()}
        saveLabel={productDraft.id ? 'Update product' : 'Add product'}
        isEditing={!!productDraft.id}
      >
        <div className="flex flex-col gap-3">
          <Input
            placeholder="Product name"
            value={productDraft.name}
            onChange={(event) =>
              setProductDraft((current) => ({ ...current, name: event.target.value }))
            }
          />
          <Input
            placeholder="Brand (optional)"
            value={productDraft.brand}
            onChange={(event) =>
              setProductDraft((current) => ({ ...current, brand: event.target.value }))
            }
          />
          <textarea
            className={textareaClassName}
            placeholder="Short description (optional)"
            value={productDraft.description}
            onChange={(event) =>
              setProductDraft((current) => ({ ...current, description: event.target.value }))
            }
          />
        </div>
        <ReferenceItemList
          emptyLabel="No products yet."
          items={products.map((product) => ({
            id: product.id,
            title: product.name,
            subtitle: product.brand ?? product.description ?? 'No extra details',
            onEdit: () =>
              setProductDraft({
                id: product.id,
                name: product.name,
                brand: product.brand ?? '',
                description: product.description ?? '',
              }),
            onDelete: () => void handleDeleteProduct(product.id),
          }))}
        />
      </EntityCard>

      <EntityCard
        title="Tools"
        description="Central tool list selectable from each item detail."
        icon={<Wrench size={16} aria-hidden />}
        busy={saveTool.isPending || deleteTool.isPending}
        onCancel={() => setToolDraft(emptyToolDraft)}
        onSave={() => void handleSaveTool()}
        saveLabel={toolDraft.id ? 'Update tool' : 'Add tool'}
        isEditing={!!toolDraft.id}
      >
        <div className="flex flex-col gap-3">
          <Input
            placeholder="Tool name"
            value={toolDraft.name}
            onChange={(event) =>
              setToolDraft((current) => ({ ...current, name: event.target.value }))
            }
          />
          <textarea
            className={textareaClassName}
            placeholder="Short description (optional)"
            value={toolDraft.description}
            onChange={(event) =>
              setToolDraft((current) => ({ ...current, description: event.target.value }))
            }
          />
        </div>
        <ReferenceItemList
          emptyLabel="No tools yet."
          items={tools.map((tool) => ({
            id: tool.id,
            title: tool.name,
            subtitle: tool.description ?? 'No description',
            onEdit: () =>
              setToolDraft({
                id: tool.id,
                name: tool.name,
                description: tool.description ?? '',
              }),
            onDelete: () => void handleDeleteTool(tool.id),
          }))}
        />
      </EntityCard>
    </div>
  );
}

function EntityCard({
  title,
  description,
  icon,
  children,
  busy,
  saveLabel,
  isEditing,
  onSave,
  onCancel,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  busy: boolean;
  saveLabel: string;
  isEditing: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="text-brand">{icon}</span>
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {children}
        <div className="flex flex-wrap justify-end gap-2">
          {isEditing ? (
            <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
              <X size={14} aria-hidden />
              Cancel
            </Button>
          ) : null}
          <Button variant="brand" size="sm" onClick={onSave} disabled={busy}>
            <Save size={14} aria-hidden />
            {busy ? 'Saving…' : saveLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ReferenceItemList({
  items,
  emptyLabel,
}: {
  items: Array<{
    id: string;
    title: string;
    subtitle: string;
    onEdit: () => void;
    onDelete: () => void;
  }>;
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-foreground-muted">{emptyLabel}</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.id} className="rounded-xl border border-border bg-background px-3 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
              <p className="line-clamp-2 text-xs text-foreground-muted">{item.subtitle}</p>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={item.onEdit}>
                <Pencil size={14} aria-hidden />
                Edit
              </Button>
              <Button variant="ghost" size="sm" onClick={item.onDelete}>
                <Trash2 size={14} aria-hidden />
                Delete
              </Button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
