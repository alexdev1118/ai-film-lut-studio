import { tutorialSteps } from "../data/tutorial";

export const Tutorial = () => {
  return (
    <div className="stack-page">
      <header className="page-header">
        <p className="eyebrow">使用教程</p>
        <h1>从静帧到 .cube LUT</h1>
        <p>按步骤完成上传、选风格、微调和导出，当前内容为前端教程展示。</p>
      </header>
      <div className="tutorial-list">
        {tutorialSteps.map((step, index) => (
          <article className="tutorial-step" key={step.id}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div>
              <h2>{step.title}</h2>
              <p>{step.summary}</p>
              <ul>
                {step.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};
