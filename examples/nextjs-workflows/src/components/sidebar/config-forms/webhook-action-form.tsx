"use client";

import type { WebhookActionConfig } from "@/types/node-configs";
import { FormField, NumberInput, CheckboxInput } from "./form-field";

export function WebhookActionForm({
  config,
  onChange,
  workflowId,
}: {
  config: WebhookActionConfig;
  onChange: (c: Partial<WebhookActionConfig>) => void;
  workflowId: string;
}) {
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/${workflowId}`;

  return (
    <>
      <FormField label="Webhook URL">
        <div className="rounded-md border bg-gray-50 px-2.5 py-1.5 text-xs text-gray-500 select-all break-all" style={{ borderColor: "#e5e7eb" }}>
          {webhookUrl}
        </div>
      </FormField>
      <FormField label="Retry Count">
        <NumberInput
          value={config.retryCount}
          onChange={(v) => onChange({ retryCount: v ?? 3 })}
          placeholder="3"
        />
      </FormField>
      <FormField label="Payload Options">
        <div className="flex flex-col gap-1.5">
          <CheckboxInput
            label="Decode Clarity values"
            checked={config.decodeClarityValues ?? true}
            onChange={(v) => onChange({ decodeClarityValues: v })}
          />
          <CheckboxInput
            label="Include raw transaction"
            checked={config.includeRawTx ?? false}
            onChange={(v) => onChange({ includeRawTx: v })}
          />
          <CheckboxInput
            label="Include block metadata"
            checked={config.includeBlockMetadata ?? true}
            onChange={(v) => onChange({ includeBlockMetadata: v })}
          />
        </div>
      </FormField>
    </>
  );
}
