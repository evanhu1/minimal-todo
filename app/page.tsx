import { WorkspaceProvider } from "@/features/workspace/WorkspaceContext";
import { TodosWorkspace } from "@/features/workspace/Workspace";

export default function Home() {
  return (
    <WorkspaceProvider>
      <TodosWorkspace />
    </WorkspaceProvider>
  );
}
