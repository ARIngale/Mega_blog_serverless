import axios from "axios";
import { useState, useContext, useEffect } from "react";
import { UserContext } from "../App";
import { filterPaginationData } from "../common/filter-pagination-data";
import Loader from "../components/loader.component";
import AnimationWrapper from "../common/page-animation";
import NoDataMessage from "../components/nodata.component";
import NotificationCard from "../components/notification-card.component";
import LoadMoreDataBtn from "../components/load-more.component";

const Notifications = () => {
    const [filter, setFilter] = useState("all");
    const [notifications, setNotifications] = useState(null);

    let filters = ["all", "like", "comment", "reply"];
    const { userAuth } = useContext(UserContext) || {};
    const access_token = userAuth?.access_token;

    const fetchNotifications = ({ page, deletedDocCount = 0 }) => {
        axios
            .post(
                import.meta.env.VITE_SERVER_DOMAIN + "/notifications",
                { page, filter, deletedDocCount },
                {
                    headers: {
                        Authorization: `Bearer ${access_token}`,
                    },
                }
            )
            .then(async ({ data: { notifications: data } }) => {
                let formatedData = await filterPaginationData({
                    state: notifications,
                    data,
                    page,
                    counteRoute: "/all-notifications-count",
                    data_to_send: { filter },
                    user: access_token,
                });

                setNotifications(formatedData);
            })
            .catch((err) => {
                console.log(err);
            });
    };

    const handleFilter = (e) => {
        let btn = e.target;

        setFilter(btn.innerHTML);
        setNotifications(null);
    };

    useEffect(() => {
        if (access_token) {
            fetchNotifications({ page: 1 });
        }
    }, [access_token, filter]);

    return (
        <div>
            <h1 className="max-md:hidden">Recent Notifications</h1>
            <div className="my-8 flex gap-4">
                {filters.map((filtername, i) => (
                    <button
                        key={i}
                        className={`py-2 ${
                            filter == filtername ? "btn-dark" : "btn-light"
                        }`}
                        onClick={handleFilter}
                    >
                        {filtername}
                    </button>
                ))}
            </div>
            <>
                {notifications === null ? (
                    <Loader />
                ) : notifications?.results?.length > 0 ? (
                    notifications.results.map((notification, i) => (
                        <AnimationWrapper
                            key={i}
                            transition={{ delay: i * 0.08 }}
                        >
                            <NotificationCard data={notification} index={i} notificationState={{notifications,setNotifications}}/>
                        </AnimationWrapper>
                    ))
                ) : (
                    <NoDataMessage message="Nothing available" />
                )}
                <LoadMoreDataBtn
                    state={notifications}
                    fetchDataFun={fetchNotifications}
                    additionalParams={{
                        deletedDocCount: notifications?.deletedDocCount || 0,
                    }}
                />
            </>
        </div>
    );
};

export default Notifications;
