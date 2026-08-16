import ReactMarkdown from "react-markdown";
import { Sparkles } from "lucide-react";
import { EmptyState } from "./StateBlock";
import "./AIExplanation.css";

export default function AIExplanation({ explanation }) {
  if (!explanation) {
    return (
      <EmptyState
        title="No AI explanation available"
        message="The AI investigation explanation has not been generated for this transaction yet."
      />
    );
  }

  return (
    <div className="ai-explanation">
      <div className="ai-explanation-badge">
        <Sparkles size={12} />
        AI Generated
      </div>
      <div className="ai-explanation-body">
        <ReactMarkdown>{explanation}</ReactMarkdown>
      </div>
    </div>
  );
}
