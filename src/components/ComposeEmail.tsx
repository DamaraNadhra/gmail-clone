import { useState, useEffect } from "react";
import {
  X,
  Minimize,
  Maximize,
  Minus,
  Paperclip,
  MoreVertical,
  Trash2,
  Send,
} from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { DraftEmail } from "~/types/types";
import { useDebounce } from "use-debounce";
import { api } from "~/utils/api";
import { useUser } from "@clerk/nextjs";
import { Textarea } from "~/components/ui/textarea";
import { EmailInput } from "~/components/EmailInput";

interface ComposeEmailProps {
  onClose: () => void;
  minimized?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
  existingDraftId?: string;
}

import { Button } from "~/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { emailHelper } from "~/lib/buildHelpers";
import toast from "react-hot-toast";

export default function ComposeEmail({
  onClose,
  minimized = false,
  onMinimize,
  onMaximize,
  existingDraftId,
}: ComposeEmailProps) {
  const { user } = useUser();
  const [isMaximized, setIsMaximized] = useState(false);
  const [draftId, setDraftId] = useState<string | undefined>(existingDraftId);
  const [lastSavedValues, setLastSavedValues] = useState<FormValues | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);

  // Query for getting draft details
  const { data: draftData, error: draftError } =
    api.email.getDraftById.useQuery(
      { draftId: existingDraftId || "" },
      {
        enabled: !!existingDraftId && existingDraftId.length > 0,
        retry: false,
      },
    );

  const formSchema = z.object({
    subject: z.string().optional(),
    to: z.array(z.string()).optional(),
    cc: z.array(z.string()).optional(),
    bcc: z.array(z.string()).optional(),
    content: z.string().optional(),
  });

  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subject: "",
      to: [],
      cc: [],
      bcc: [],
      content: "",
    },
  });

  const formValues = form.watch();
  const [debouncedFormValues] = useDebounce(formValues, 2000);

  // tRPC hooks
  const saveDraftMutation = api.email.saveDraft.useMutation({
    onSuccess: (data) => {
      if (data?.draft?.id && !draftId) {
        setDraftId(data.draft.id);
      }
    },
    onError: (error: any) => {
      console.error(`Failed to save draft: ${error.message}`);
    },
  });

  const sendDraftMutation = api.email.sendDraft.useMutation({
    onSuccess: (data) => {
      console.log("Draft sent successfully:", data);
    },
  });

  // Save draft when debounced form values change
  useEffect(() => {
    const hasContent =
      debouncedFormValues.to?.length ||
      debouncedFormValues.cc?.length ||
      debouncedFormValues.bcc?.length ||
      debouncedFormValues.subject ||
      debouncedFormValues.content;

    const hasChanges =
      !lastSavedValues ||
      JSON.stringify(debouncedFormValues) !== JSON.stringify(lastSavedValues);

    if (hasContent && hasChanges && !isSaving) {
      handleSaveDraft();
    }
  }, [debouncedFormValues, lastSavedValues, isSaving]);

  // Load existing draft if data is available
  useEffect(() => {
    if (draftData?.draft) {
      // Get all "To" recipients
      const toRecipients = draftData.draft.recipients
        .filter((r: any) => r.isTo)
        .map((r: any) => r.emailPerson.email);

      // Get all "Cc" recipients
      const ccRecipients = draftData.draft.recipients
        .filter((r: any) => r.isCc)
        .map((r: any) => r.emailPerson.email);

      // Get all "Bcc" recipients
      const bccRecipients = draftData.draft.recipients
        .filter((r: any) => r.isBcc)
        .map((r: any) => r.emailPerson.email);

      // Update form values
      form.reset({
        subject: draftData.draft.emailSubject,
        content: draftData.draft.emailContent,
        to: toRecipients,
        cc: ccRecipients,
        bcc: bccRecipients,
      });
    }
  }, [draftData, form]);

  // Log any draft fetching errors
  useEffect(() => {
    if (draftError) {
      console.error("Error fetching draft:", draftError);
    }
  }, [draftError]);

  // Keep draftId in sync with existingDraftId prop
  useEffect(() => {
    if (existingDraftId && existingDraftId !== draftId) {
      console.log("Updating draftId from existingDraftId:", existingDraftId);
      setDraftId(existingDraftId);
    }
  }, [existingDraftId, draftId]);

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      // If we're currently saving, wait for it to complete
      // need to save the draft first
      await handleSaveDraft();
      if (isSaving) {
        toast.loading("Finishing draft save before sending...");
        // Wait until saving is complete
        await new Promise((resolve) => {
          const checkSaving = () => {
            if (!isSaving) {
              resolve(true);
            } else {
              setTimeout(checkSaving, 500);
            }
          };
          checkSaving();
        });
      }

      // Show optimistic UI update
      toast.success("Sending email...");

      // Close the compose email immediately for better UX
      onClose();

      // Handle the actual sending
      await handleSend();
    } catch (error) {
      console.error("Error sending email:", error);
      toast.error("Failed to send email. Please try again.");
    }
  };

  const handleMaximize = () => {
    setIsMaximized(!isMaximized);
    if (onMaximize) onMaximize();
  };

  const handleSaveDraft = async () => {
    if (!user || isSaving) return;

    try {
      setIsSaving(true);
      console.log(
        "Saving draft... for draftId:",
        draftId,
        "existingDraftId:",
        existingDraftId,
      );

      // If there's no valid draftId, create a new draft instead of updating
      if (!draftId) {
        console.log("No valid draftId found, treating as new draft");
      }

      await saveDraftMutation.mutateAsync({
        subject: formValues.subject,
        to: formValues.to || [],
        cc: formValues.cc || [],
        bcc: formValues.bcc || [],
        content: formValues.content,
        draftId: draftId && draftId.length > 0 ? draftId : undefined,
      });
      setLastSavedValues({ ...formValues });
      console.log("Draft saved successfully");
    } catch (error) {
      console.error("Error saving draft:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSend = async () => {
    if (!draftId && !isSaving) {
      // If there's no draft ID yet, save first then send
      await handleSaveDraft();
    }

    if (draftId) {
      try {
        await sendDraftMutation.mutateAsync({ draftId });
        toast.success("Email sent successfully");
      } catch (error) {
        console.error("Error sending email:", error);
        toast.error("Failed to send email");
        throw error; // Propagate error to onSubmit handler
      }
    }
  };

  if (minimized) {
    return (
      <div className="fixed bottom-0 right-24 z-10 w-64 rounded-t-lg border border-gray-300 bg-white shadow-md">
        <div className="flex cursor-pointer items-center justify-between bg-gray-100 px-4 py-2">
          <div className="font-medium">
            {formValues.subject ? formValues.subject : "New Message"}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onMinimize}>
              <Maximize className="h-4 w-4 text-gray-600" />
            </button>
            <button onClick={onClose}>
              <X className="h-4 w-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed ${
        isMaximized ? "inset-4 h-auto" : "bottom-0 right-24 h-[500px]"
      } z-10 flex flex-col rounded-t-lg border border-gray-300 bg-white shadow-md ${
        isMaximized ? "w-auto" : "w-[500px]"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between bg-gray-100 px-4 py-2">
        <div className="font-medium">
          {formValues.subject ? formValues.subject : "New Message"}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onMinimize}>
            <Minus className="h-4 w-4 text-gray-600" />
          </button>
          <button onClick={handleMaximize}>
            {isMaximized ? (
              <Minimize className="h-4 w-4 text-gray-600" />
            ) : (
              <Maximize className="h-4 w-4 text-gray-600" />
            )}
          </button>
          <button onClick={onClose}>
            <X className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Email form */}
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-1 flex-col"
        >
          <div className="flex flex-col gap-2 border-b border-gray-200 p-4">
            <div className="flex items-center">
              <span className="w-12 text-sm text-gray-600">To</span>
              <Controller
                control={form.control}
                name="to"
                render={({ field }) => (
                  <EmailInput
                    placeholder="Recipient email"
                    value={field.value || []}
                    onChange={field.onChange}
                    className="flex-1"
                  />
                )}
              />
            </div>

            <div className="flex items-center">
              <span className="w-12 text-sm text-gray-600">Cc</span>
              <Controller
                control={form.control}
                name="cc"
                render={({ field }) => (
                  <EmailInput
                    placeholder="Cc"
                    value={field.value || []}
                    onChange={field.onChange}
                    className="flex-1"
                  />
                )}
              />
            </div>

            <div className="flex items-center">
              <span className="w-12 text-sm text-gray-600">Bcc</span>
              <Controller
                control={form.control}
                name="bcc"
                render={({ field }) => (
                  <EmailInput
                    placeholder="Bcc"
                    value={field.value || []}
                    onChange={field.onChange}
                    className="flex-1"
                  />
                )}
              />
            </div>
          </div>

          <div className="border-b border-gray-200 p-4">
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormControl>
                  <Input
                    placeholder="Subject"
                    {...field}
                    className="w-full border-none bg-transparent outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </FormControl>
              )}
            />
          </div>

          <div className="flex-1 p-4">
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormControl>
                  <Textarea
                    placeholder="Compose email"
                    {...field}
                    className="h-full w-full resize-none border-none bg-transparent outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </FormControl>
              )}
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-gray-200 p-3">
            <div className="flex items-center gap-2">
              <Button
                type="submit"
                className="rounded-md bg-blue-500 px-4 py-2 font-medium text-white hover:bg-blue-600"
              >
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  <span>Send</span>
                </div>
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="rounded p-2 hover:bg-gray-100"
              >
                <Paperclip className="h-4 w-4 text-gray-600" />
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="rounded p-2 hover:bg-gray-100"
              >
                <MoreVertical className="h-4 w-4 text-gray-600" />
              </Button>
            </div>

            <Button
              type="button"
              variant="ghost"
              className="rounded p-2 hover:bg-gray-100"
              onClick={() => {
                // TODO: Implement delete draft functionality
              }}
            >
              <Trash2 className="h-4 w-4 text-gray-600" />
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
