import { waitFor } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { AxiosError } from "axios";
import parse from "date-fns/parse";

declare global {
  interface Window {
    roamAlphaAPI: {
      q: (
        query: string
      ) => {
        attrs?: { source: string[] }[][];
        string?: string;
      }[][];
    };
    roamDatomicAlphaAPI: (params: {
      action: "pull" | "q" | "create-block" | "update-block";
      selector?: string;
      uid?: string;
      query?: string;
      inputs?: any;
      location?: {
        "parent-uid": string;
        order: number;
      };
      block?: {
        string: string;
        uid?: string;
        open?: boolean;
      };
    }) => Promise<{
      children?: { id: number }[];
      id?: number;
      string?: string;
    }>;
  }
}

type RoamError = {
  raw: string;
  "status-code": number;
};

export const asyncType = async (text: string) =>
  document.activeElement &&
  (await userEvent.type(document.activeElement, text, {
    skipClick: true,
  }));

export const genericError = (e: Partial<AxiosError & RoamError>) => {
  const message =
    (e.response
      ? typeof e.response.data === "string"
        ? e.response.data
        : JSON.stringify(e.response.data)
      : e.message) ||
    e.raw ||
    "Unknown Error Occurred";
  asyncType(
    `Error: ${message.length > 50 ? `${message.substring(0, 50)}...` : message}`
  );
};

export const getAttrConfigFromQuery = (query: string) => {
  const pageResults = window.roamAlphaAPI.q(query);
  if (pageResults.length === 0 || !pageResults[0][0].attrs) {
    return {};
  }

  const configurationAttrRefs = pageResults[0][0].attrs.map(
    (a: any) => a[2].source[1]
  );
  const entries = configurationAttrRefs.map(
    (r: string) =>
      window.roamAlphaAPI
        .q(
          `[:find (pull ?e [:block/string]) :where [?e :block/uid "${r}"] ]`
        )[0][0]
        .string?.split("::")
        .map((s: string) => s.trim()) || [r, "undefined"]
  );
  return Object.fromEntries(entries);
};

export const parseRoamDate = (s: string) =>
  parse(s, "MMMM do, yyyy", new Date());

const waitForString = (text: string) =>
  waitFor(
    () => {
      const textArea = document.activeElement as HTMLTextAreaElement;
      if (textArea?.value == null) {
        throw new Error(
          `Textarea is undefined. Active Element ${textArea.tagName}. Input text ${text}`
        );
      }

      let expectedTextWithoutPeriod = text.replace(/\./g, "").toUpperCase();
      let actualTextWithoutPeriod = textArea.value
        .replace(/\./g, "")
        .toUpperCase();

      // relaxing constraint for equality because there is an issue with periods.
      // in some cases, userEvent.type doesn't type the periods.
      if (actualTextWithoutPeriod !== expectedTextWithoutPeriod) {
        throw new Error("Typing not complete");
      }
    },
    {
      timeout: 5000,
    }
  );
