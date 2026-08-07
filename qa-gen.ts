import { buildItineraryPdf } from "@/lib/itinerary-pdf";
import { adjustDayForWeather } from "@/lib/weather-adjust";
const plan:any={title:"Kaveri Delta Temple Trail",summary:"A three-day loop through Thanjavur, Kumbakonam and Swamimalai with hidden gems and slow mornings.",total_cost:18500,
days:[1,2,3].map(i=>({day:i,title:["Thanjavur grandeur","Kumbakonam circuit","Swamimalai & return"][i-1],morning:"Drive out at 6 AM and reach the Big Temple for a quiet darshan before crowds.",breakfast:"Filter coffee and pongal at Sathars",temple:"Brihadeeswarar Temple - allow 2 hours for the corridors",nearby:"Thanjavur Royal Palace and Saraswathi Mahal Library",lunch:"Banana-leaf meals at Vasantha Bhavan",scenic:"Sunset walk along the Grand Anicut backwaters",sunset:"Kallanai viewpoint",dinner:"Chettinad thali",return_home:"Back to hotel by 9 PM",notes:"Carry socks; the stone floor is hot.",estimated_cost:6200})),
travel_tips:["Book darshan slots online","Avoid 12-3 PM outdoors"],packing_list:["Cotton clothes","Sunscreen","Power bank"]};
const fs=[{max:36,min:26,condition:"Sunny",rain:5,date:"2026-08-10"},{max:29,min:24,condition:"Heavy rain",rain:80,date:"2026-08-11"},{max:31,min:11,condition:"Cloudy",rain:35,date:"2026-08-12"}];
const days=plan.days.map((d:any,i:number)=>({day:d,date:fs[i].date,forecast:fs[i] as any,adjusted:adjustDayForWeather(d,fs[i] as any)}));
const doc=buildItineraryPdf(plan,days,{startCity:"Chennai",travelMode:"car"});
require("fs").writeFileSync("/tmp/qa/out.pdf",Buffer.from(doc.output("arraybuffer")));
