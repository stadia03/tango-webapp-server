import expres from 'express';
import DailyReport from '../models/DailyReport';
import MonthlySummary from '../models/MonthlySummary';
import { Payment } from '../models/Payment';
import dbConnect from '../utils/db';

const router = expres.Router();


router.get("/server-date", async (req, res) => {
  const DATE = new Date();
  // const formattedDate = `${date.getDate()} ${date
  //   .toLocaleString("default", { month: "long" })
  //   .toUpperCase()} ${date.getFullYear()}`;
const formattedDate = `${DATE.getUTCDate()} ${DATE.toLocaleString("default", 
  { month: "long", timeZone: "UTC" })
  .toUpperCase()} ${DATE.getUTCFullYear()}`;

  res.status(200).send(formattedDate);
});

router.get('/latest-report', async (req, res):Promise<any> => {
  try {

    await dbConnect();

    const lastEntry = await DailyReport
      .findOne({})
      .sort({ date: -1 }) // Most recent date first
      .lean(); // Plain JS object for faster read
  
    if (!lastEntry) {
      return res.status(404).json({ message: 'No daily reports found.' });
    }

    res.status(200).json(lastEntry);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error', details: (error as Error).message });
  }
});

router.get('/latest-month-summary', async (req, res):Promise<any> => {
  try {

    await dbConnect();

    const latestSummary = await MonthlySummary
      .findOne({})
      .sort({ year: -1, month: -1 }) // Sort by latest year, then month
      .lean();
       

    if (!latestSummary) {
      return res.status(404).json({ message: 'No monthly summary found.' });
    }

    res.status(200).json(latestSummary);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error', details: (error as Error).message });
  }
});

router.get('/month-summary/:year/:month', async (req, res):Promise<any> => {
  
// router.get('/month-summary', async (req, res):Promise<any> => {
  const { year, month } = req.params;
//   const year = "2025";
//   const month = "6";
  try {

    await dbConnect();

    const summary = await MonthlySummary.findOne({
      year: parseInt(year),
      month: parseInt(month),
    }).lean();
//      const result = await MonthlySummary.findOne({
//       year: parseInt(year),
//       month: parseInt(month),
//     }).lean().explain('executionStats');
// console.log(result);
    if (!summary) {
      return res.status(404).json({ message: 'Monthly summary not found.' });
    }

    res.status(200).json(summary);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error', details: (error as Error).message });
  }
});

router.get('/month-daily-reports/:year/:month', async (req, res):Promise<any> => {
  const { year, month } = req.params;

  try {

    await dbConnect();

    const dailyReports = await DailyReport.find({
      year: parseInt(year),
      month: parseInt(month),
    }).sort({ date: 1 }).lean(); // Sort by ascending date

    if (dailyReports.length === 0) {
      return res.status(404).json({ message: 'No daily reports found for the given month and year.' });
    }

    res.status(200).json(dailyReports);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error', details: (error as Error).message });
  }
});

interface PaymentQuery {
  travelAgency?: { $regex: string; $options: string };
  updatedBy?: { $regex: string; $options: string };
  bank?: { $regex: string; $options: string };
  method?: string;
  checkIn?: { $gte?: Date; $lte?: Date };
  date?: { $gte?: Date; $lte?: Date };
  bookingNumber?: { $regex: string; $options: string };
}

router.get("/fetch-payment", async(req,res)=>{
  
  try {
    const {
      travelAgency,
      updatedBy,
      bank,
      method,
      fromDate,
      toDate,
      fromPaymentDate,
      toPaymentDate,
      bookingNumber,
      sortBy = 'date',
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = req.query;

    // Build the query object
    const query: PaymentQuery = {};

    // Text search filters
    if (travelAgency) query.travelAgency = { $regex: travelAgency as string, $options: 'i' };
    if (updatedBy) query.updatedBy = { $regex: updatedBy as string, $options: 'i' };
    if (bank) query.bank = { $regex: bank as string, $options: 'i' };
    if (method) query.method = method as string;
    if (bookingNumber) query.bookingNumber = { $regex: bookingNumber as string, $options: 'i' };

    // Date range filters for check-in
    if (fromDate || toDate) {
      query.checkIn = {};
      if (fromDate) query.checkIn.$gte = new Date(fromDate as string);
      if (toDate) query.checkIn.$lte = new Date(toDate as string);
    }

    // Date range filters for payment date
    if (fromPaymentDate || toPaymentDate) {
      query.date = {};
      if (fromPaymentDate) query.date.$gte = new Date(fromPaymentDate as string);
      if (toPaymentDate) query.date.$lte = new Date(toPaymentDate as string);
    }

    // Sorting
    const sortOptions: any = {};
    sortOptions[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    // Pagination
    const pageNumber = parseInt(page as string);
    const limitNumber = parseInt(limit as string);
    const skip = (pageNumber - 1) * limitNumber;

    // Execute query with sorting and pagination
    const payments = await Payment.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNumber)
      .lean();

    // Get total count for pagination info
    const totalCount = await Payment.countDocuments(query);

    // Calculate totals for the current filtered set
    const aggregation = await Payment.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      }
    ]);

    const totals = aggregation[0] || { totalAmount: 0, count: 0 };

    // Get breakdown by payment method
    const methodBreakdown = await Payment.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$method",
          total: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]);

    // Get breakdown by bank
    const bankBreakdown = await Payment.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$bank",
          total: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]);

    res.json({
      success: true,
      data: payments,
      pagination: {
        total: totalCount,
        page: pageNumber,
        pages: Math.ceil(totalCount / limitNumber),
        limit: limitNumber
      },
      summary: {
        totalAmount: totals.totalAmount,
        totalPayments: totals.count,
        methodBreakdown,
        bankBreakdown
      }
    });

  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;