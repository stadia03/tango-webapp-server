import expres from 'express';
import DailyReport from '../models/DailyReport';
import MonthlySummary from '../models/MonthlySummary';
import dbConnect from '../utils/db';

const router = expres.Router();

router.get("/server-date", async (req, res) => {
  const date = new Date();
  const formattedDate = `${date.getDate()} ${date
    .toLocaleString("default", { month: "long" })
    .toUpperCase()} ${date.getFullYear()}`;
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

// //testing-purpose
// router.post('/test/month-entry', async(req,res)=>{
//   const report = new MonthlySummary({
//      month: req.body.month,
//   year:req.body.year ,
//   totalRoomSold:req.body.totalRoomSold,
//   avgRoomPerDay:req.body.avgRoomPerDay ,
//   avgOccupancy :req.body.avgOccupancy,
//   totalRoomRevenue:req.body.totalRoomRevenue ,
//   arr :req.body.arr,
//   revPerRoom:req.body.revPerRoom,
//   totalRestaurantSale:req.body.totalRestaurantSale,
//   totalMealPlanSale:req.body.totalMealPlanSale,
//   totalBarSale:req.body.totalBarSale,
//   totalCld:req.body.totalCld,
//   totalCake:req.body.totalCake,
//   totalExpense:req.body.totalExpense,
//   totalCashDeposit:req.body.totalCashDeposit,
//   totalPettyCash:req.body.totalPettyCash,
//   totalMonthRevenue:req.body.totalMonthRevenue
//   });
//   await report.save();
//   res.json({message : "Saved!"})
// })



export default router;