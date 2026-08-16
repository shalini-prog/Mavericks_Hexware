import { BookOpen } from "lucide-react";
import { EmptyState } from "./StateBlock";
import "./RagKnowledgeCard.css";

export default function RagKnowledgeCard({ ragKnowledge }) {
  if (!ragKnowledge || ragKnowledge.length === 0) {
    return <EmptyState title="No knowledge retrieved" message="No RAG documents were returned for this transaction." />;
  }

  return (
    <div className="rag-grid">
      {ragKnowledge.map((item, i) => {
        const similarityPct = Math.round((Number(item.similarity) || 0) * 100);
        return (
          <div className="rag-card" key={i}>
            <div className="rag-card-header">
              <div className="rag-card-icon">
                <BookOpen size={14} />
              </div>
              <div className="rag-card-title-block">
                <span className="rag-card-feature mono">{item.feature}</span>
                <span className="rag-card-title">{item.title}</span>
              </div>
            </div>

            <div className="rag-similarity">
              <div className="rag-similarity-bar">
                <div className="rag-similarity-fill" style={{ width: `${similarityPct}%` }} />
              </div>
              <span className="rag-similarity-value mono">{similarityPct}%</span>
            </div>

            <p className="rag-card-content">{item.content}</p>
          </div>
        );
      })}
    </div>
  );
}
