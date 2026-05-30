"use client";

import { useState } from "react";

import type { SimpleModeFaqItem } from "@/lib/simple-mode-rules";
import styles from "./corporate-shell.module.css";

interface SimpleModeFaqProps {
  faqs: SimpleModeFaqItem[];
}

export function SimpleModeFaq({ faqs }: SimpleModeFaqProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.simpleModeFaqSection}>
      <button
        type="button"
        className={styles.simpleModeFaqToggle}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls="faq-region"
      >
        <span>Preguntas frecuentes</span>
        <span className={styles.simpleModeFaqToggleIcon}>{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div id="faq-region" className={styles.simpleModeFaqGrid}>
          {faqs.map((item) => (
            <details key={item.question} className={styles.simpleModeFaqItem}>
              <summary>{item.question}</summary>
              <div className={styles.simpleModeFaqBody}>
                {item.answer.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
