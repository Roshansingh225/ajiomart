import { BotMessageSquare, Send, Sparkles, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useStore } from '../context/StoreContext.jsx';
import { formatCurrency } from '../lib/catalog.js';

const starterMessages = [
  {
    role: 'assistant',
    content: 'Hi, I am the Ajiomart style assistant. Tell me the plan and I will suggest fashion, beauty, and jewellery picks.',
  },
];

const quickPrompts = ['Office outfit', 'Wedding guest look', 'Jewellery finishing touch', 'Everyday glow kit'];

export default function StyleAssistant() {
  const { products } = useStore();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(starterMessages);
  const [input, setInput] = useState('');

  const grouped = useMemo(
    () => ({
      dress: products.find((product) => product.category === 'Dresses'),
      makeup: products.find((product) => product.category === 'Makeup'),
      skincare: products.find((product) => product.category === 'Skincare'),
      bag: products.find((product) => product.category === 'Handbags'),
      shoes: products.find((product) => product.category === 'Footwear'),
      jewellery: products.find((product) => product.category === 'Jewellery'),
    }),
    [products],
  );

  function buildReply(prompt) {
    const lower = prompt.toLowerCase();

    if (lower.includes('office') || lower.includes('work')) {
      return `For work, try ${grouped.bag?.name || 'a structured handbag'} with tailored separates and a clean lip. Keep the palette calm, then add ${grouped.shoes?.name || 'comfortable sneakers'} for an easy commute.`;
    }

    if (lower.includes('jewel') || lower.includes('accessor')) {
      return grouped.jewellery
        ? `${grouped.jewellery.name} at ${formatCurrency(grouped.jewellery.price)} is a lovely finishing touch. Pair it with a clean neckline and keep the rest of your look simple.`
        : 'A delicate necklace or a pair of sculptural earrings can finish the look. Our jewellery edit is being curated now.';
    }

    if (lower.includes('wedding') || lower.includes('party') || lower.includes('evening')) {
      const jewelleryFinish = grouped.jewellery ? ` Add ${grouped.jewellery.name} at ${formatCurrency(grouped.jewellery.price)} for a finishing touch.` : '';
      return `For an event look, start with ${grouped.dress?.name || 'a satin dress'} at ${formatCurrency(grouped.dress?.price)} and finish with a berry lip from ${grouped.makeup?.name || 'the lip wardrobe'}.${jewelleryFinish}`;
    }

    if (lower.includes('skin') || lower.includes('glow') || lower.includes('beauty')) {
      return `For a fresh glow, use ${grouped.skincare?.name || 'a serum kit'} before makeup, then choose a soft coral lip and a light fragrance.`;
    }

    return 'I would build your look around one hero piece, one comfort piece, and one beauty or jewellery finish. Dresses, makeup, and jewellery make an easy Ajiomart pairing.';
  }

  function askAssistant(prompt) {
    const question = prompt.trim();
    if (!question) return;

    setMessages((current) => [
      ...current,
      { role: 'user', content: question },
      { role: 'assistant', content: buildReply(question) },
    ]);
    setInput('');
  }

  function handleSubmit(event) {
    event.preventDefault();
    askAssistant(input);
  }

  return (
    <>
      {open && (
        <section className="ai-panel">
          <div className="ai-panel-header">
            <div>
              <p className="eyebrow">Ajiomart AI</p>
              <h2>Style Assistant</h2>
            </div>
            <button className="icon-button" onClick={() => setOpen(false)} aria-label="Close style assistant">
              <X size={18} />
            </button>
          </div>

          <div className="ai-messages">
            {messages.map((message, index) => (
              <article
                key={`${message.role}-${index}`}
                className={message.role === 'assistant' ? 'ai-bubble assistant' : 'ai-bubble user'}
              >
                {message.content}
              </article>
            ))}
          </div>

          <div className="ai-quick-prompts">
            {quickPrompts.map((prompt) => (
              <button key={prompt} type="button" onClick={() => askAssistant(prompt)}>
                <Sparkles size={14} /> {prompt}
              </button>
            ))}
          </div>

          <form className="ai-form" onSubmit={handleSubmit}>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask for a look, shade, or routine..."
            />
            <button className="icon-button" type="submit" aria-label="Send message">
              <Send size={16} />
            </button>
          </form>
        </section>
      )}

      <button className="ai-fab" onClick={() => setOpen((value) => !value)} aria-label="Open style assistant">
        <BotMessageSquare size={20} />
        <span>Ask Ajiomart AI</span>
      </button>
    </>
  );
}
