import { useUser } from "@clerk/nextjs";
import { Checkbox } from "~/components/ui/checkbox";
import { Table, TableHeader, TableRow, TableHead, TableCell, TableBody } from "~/components/ui/table";

export default function Something() {
  const { user } = useUser();
  return (
    // <Table className="bg-white">
    //   <TableHeader>
    //     <TableRow>
    //       <TableHead>Name</TableHead>
    //       <TableHead>Email</TableHead>
    //     </TableRow>
    //   </TableHeader>
    //   <TableBody>
    //     <TableRow className="hover:shadow-red-600 cursor-pointer">
    //       <TableCell>John Doe</TableCell>
    //       <TableCell>john.doe@example.com</TableCell>
    //     </TableRow>
    //   </TableBody>
    // </Table>
    <div className="flex h-full flex-col grow rounded-lg bg-red-500">
      <div className="flex w-full items-center border-b border-white p-2">
        <div className="ml-2 flex items-center gap-2 justify-center">
          <div className="h-10 w-10 rounded-full bg-gray-500 shadow-2xl">
          </div>
        </div>
      </div>
    </div>
  )
}
